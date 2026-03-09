use crate::config::AppConfig;
use crate::executor::execute_task;
use crate::models::{Execution, ScheduleType, Settings, Task, TaskInput};
use crate::scheduler::compute_next_run;
use chrono::Utc;
use std::sync::Arc;
use tauri::State;

fn validate_task_input(input: &TaskInput) -> Result<(), String> {
    let name = input.name.trim();
    if name.is_empty() {
        return Err("Task name cannot be empty".to_string());
    }
    if name.len() > 200 {
        return Err("Task name is too long (max 200 characters)".to_string());
    }
    if input.command.trim().is_empty() {
        return Err("Command cannot be empty".to_string());
    }
    if input.working_directory.trim().is_empty() {
        return Err("Working directory cannot be empty".to_string());
    }
    let wd = std::path::Path::new(&input.working_directory);
    if !wd.is_absolute() {
        return Err("Working directory must be an absolute path".to_string());
    }
    if let ScheduleType::CustomCron = input.schedule.schedule_type {
        if let Some(expr) = &input.schedule.cron_expression {
            use std::str::FromStr;
            cron::Schedule::from_str(expr)
                .map_err(|e| format!("Invalid cron expression: {}", e))?;
        } else {
            return Err("Cron expression is required for custom_cron schedule".to_string());
        }
    }
    Ok(())
}

#[tauri::command]
pub fn get_tasks(app_config: State<'_, Arc<AppConfig>>) -> Result<Vec<Task>, String> {
    let config = app_config.config.lock().map_err(|e| e.to_string())?;
    Ok(config.tasks.clone())
}

#[tauri::command]
pub fn create_task(
    app_config: State<'_, Arc<AppConfig>>,
    input: TaskInput,
) -> Result<Task, String> {
    validate_task_input(&input)?;
    let now = Utc::now().to_rfc3339();
    let task = Task {
        id: uuid::Uuid::new_v4().to_string(),
        name: input.name,
        command: input.command,
        working_directory: input.working_directory,
        schedule: input.schedule,
        enabled: true,
        env_vars: input.env_vars,
        timeout_seconds: input.timeout_seconds,
        created_at: now.clone(),
        updated_at: now,
    };

    {
        let mut config = app_config.config.lock().map_err(|e| e.to_string())?;
        config.tasks.push(task.clone());
    }
    app_config.save()?;

    Ok(task)
}

#[tauri::command]
pub fn update_task(
    app_config: State<'_, Arc<AppConfig>>,
    id: String,
    input: TaskInput,
) -> Result<Task, String> {
    validate_task_input(&input)?;
    let mut config = app_config.config.lock().map_err(|e| e.to_string())?;

    let task = config
        .tasks
        .iter_mut()
        .find(|t| t.id == id)
        .ok_or_else(|| format!("Task {} not found", id))?;

    task.name = input.name;
    task.command = input.command;
    task.working_directory = input.working_directory;
    task.schedule = input.schedule;
    task.env_vars = input.env_vars;
    task.timeout_seconds = input.timeout_seconds;
    task.updated_at = Utc::now().to_rfc3339();

    let updated = task.clone();
    drop(config);
    app_config.save()?;

    Ok(updated)
}

#[tauri::command]
pub fn delete_task(
    app_config: State<'_, Arc<AppConfig>>,
    id: String,
) -> Result<(), String> {
    {
        let mut config = app_config.config.lock().map_err(|e| e.to_string())?;
        config.tasks.retain(|t| t.id != id);
    }
    app_config.save()?;
    app_config.delete_log(&id);
    Ok(())
}

#[tauri::command]
pub fn toggle_task(
    app_config: State<'_, Arc<AppConfig>>,
    id: String,
    enabled: bool,
) -> Result<(), String> {
    {
        let mut config = app_config.config.lock().map_err(|e| e.to_string())?;
        let task = config
            .tasks
            .iter_mut()
            .find(|t| t.id == id)
            .ok_or_else(|| format!("Task {} not found", id))?;
        task.enabled = enabled;
        task.updated_at = Utc::now().to_rfc3339();
    }
    app_config.save()?;
    Ok(())
}

#[tauri::command]
pub fn run_task_now(
    app_handle: tauri::AppHandle,
    app_config: State<'_, Arc<AppConfig>>,
    id: String,
) -> Result<(), String> {
    let (command, working_directory, env_vars, timeout_seconds, task_name) = {
        let config = app_config.config.lock().map_err(|e| e.to_string())?;
        let task = config
            .tasks
            .iter()
            .find(|t| t.id == id)
            .ok_or_else(|| format!("Task {} not found", id))?;
        (
            task.command.clone(),
            task.working_directory.clone(),
            task.env_vars.clone(),
            task.timeout_seconds,
            task.name.clone(),
        )
    };

    execute_task(
        app_handle,
        Arc::clone(&app_config),
        id,
        command,
        working_directory,
        env_vars,
        timeout_seconds,
        task_name,
    );

    Ok(())
}

#[tauri::command]
pub fn get_executions(
    app_config: State<'_, Arc<AppConfig>>,
    task_id: String,
    limit: Option<usize>,
) -> Result<Vec<Execution>, String> {
    let mut executions = app_config.load_executions(&task_id);
    executions.reverse(); // Most recent first
    if let Some(limit) = limit {
        executions.truncate(limit);
    }
    Ok(executions)
}

#[tauri::command]
pub fn get_next_run(
    app_config: State<'_, Arc<AppConfig>>,
    id: String,
) -> Result<Option<String>, String> {
    let config = app_config.config.lock().map_err(|e| e.to_string())?;
    let task = config
        .tasks
        .iter()
        .find(|t| t.id == id)
        .ok_or_else(|| format!("Task {} not found", id))?;

    if !task.enabled {
        return Ok(None);
    }

    Ok(compute_next_run(&task.schedule))
}

#[tauri::command]
pub fn get_settings(
    app_config: State<'_, Arc<AppConfig>>,
) -> Result<Settings, String> {
    let config = app_config.config.lock().map_err(|e| e.to_string())?;
    Ok(config.settings.clone())
}

#[tauri::command]
pub fn update_settings(
    app_config: State<'_, Arc<AppConfig>>,
    settings: Settings,
) -> Result<(), String> {
    {
        let mut config = app_config.config.lock().map_err(|e| e.to_string())?;
        config.settings = settings;
    }
    app_config.save()?;
    Ok(())
}
