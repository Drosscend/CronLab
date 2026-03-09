use crate::config::AppConfig;
use crate::models::{Execution, ExecutionStatus};
use chrono::Utc;
use std::process::{Command, Stdio};
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::AppHandle;

pub fn execute_task(
    app_handle: AppHandle,
    app_config: Arc<AppConfig>,
    task_id: String,
    command: String,
    working_directory: String,
    env_vars: std::collections::HashMap<String, String>,
    timeout_seconds: Option<u64>,
    task_name: String,
) {
    thread::spawn(move || {
        let execution_id = uuid::Uuid::new_v4().to_string();
        let started_at = Utc::now().to_rfc3339();

        let default_timeout = {
            let config = app_config.config.lock().unwrap();
            config.settings.default_timeout_seconds
        };
        let timeout = timeout_seconds.unwrap_or(default_timeout);

        // Save a "running" entry immediately so it appears in logs
        let running_execution = Execution {
            id: execution_id.clone(),
            task_id: task_id.clone(),
            started_at: started_at.clone(),
            finished_at: None,
            exit_code: None,
            stdout: String::new(),
            stderr: String::new(),
            status: ExecutionStatus::Running,
        };
        save_or_update_execution(&app_config, &task_id, &execution_id, running_execution);

        // Parse command
        let parts: Vec<&str> = command.split_whitespace().collect();
        if parts.is_empty() {
            let execution = Execution {
                id: execution_id.clone(),
                task_id: task_id.clone(),
                started_at,
                finished_at: Some(Utc::now().to_rfc3339()),
                exit_code: Some(-1),
                stdout: String::new(),
                stderr: "Empty command".to_string(),
                status: ExecutionStatus::Failed,
            };
            save_or_update_execution(&app_config, &task_id, &execution_id, execution);
            return;
        }

        let program = parts[0];
        let args = &parts[1..];

        let child_result = Command::new(program)
            .args(args)
            .current_dir(&working_directory)
            .envs(&env_vars)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn();

        let mut child = match child_result {
            Ok(c) => c,
            Err(e) => {
                let execution = Execution {
                    id: execution_id.clone(),
                    task_id: task_id.clone(),
                    started_at,
                    finished_at: Some(Utc::now().to_rfc3339()),
                    exit_code: Some(-1),
                    stdout: String::new(),
                    stderr: format!("Failed to spawn: {}", e),
                    status: ExecutionStatus::Failed,
                };
                save_or_update_execution(&app_config, &task_id, &execution_id, execution);
                send_notification(&app_handle, &app_config, &task_name, ExecutionStatus::Failed, Some(-1));
                return;
            }
        };

        // Wait with timeout
        let timeout_duration = Duration::from_secs(timeout);
        let start = std::time::Instant::now();

        loop {
            match child.try_wait() {
                Ok(Some(status)) => {
                    let finished_at = Utc::now().to_rfc3339();
                    let exit_code = status.code().unwrap_or(-1);

                    let stdout = child
                        .stdout
                        .take()
                        .map(|out| {
                            let mut buf = String::new();
                            use std::io::Read;
                            let _ = out.take(10000).read_to_string(&mut buf);
                            buf
                        })
                        .unwrap_or_default();

                    let stderr = child
                        .stderr
                        .take()
                        .map(|err| {
                            let mut buf = String::new();
                            use std::io::Read;
                            let _ = err.take(10000).read_to_string(&mut buf);
                            buf
                        })
                        .unwrap_or_default();

                    let exec_status = if exit_code == 0 {
                        ExecutionStatus::Success
                    } else {
                        ExecutionStatus::Failed
                    };

                    let execution = Execution {
                        id: execution_id.clone(),
                        task_id: task_id.clone(),
                        started_at,
                        finished_at: Some(finished_at),
                        exit_code: Some(exit_code),
                        stdout,
                        stderr,
                        status: exec_status.clone(),
                    };

                    save_or_update_execution(&app_config, &task_id, &execution_id, execution);
                    send_notification(&app_handle, &app_config, &task_name, exec_status, Some(exit_code));
                    return;
                }
                Ok(None) => {
                    if start.elapsed() >= timeout_duration {
                        let _ = child.kill();
                        let _ = child.wait();
                        let finished_at = Utc::now().to_rfc3339();

                        let execution = Execution {
                            id: execution_id.clone(),
                            task_id: task_id.clone(),
                            started_at,
                            finished_at: Some(finished_at),
                            exit_code: None,
                            stdout: String::new(),
                            stderr: format!("Process killed after {}s timeout", timeout),
                            status: ExecutionStatus::Timeout,
                        };

                        save_or_update_execution(&app_config, &task_id, &execution_id, execution);
                        send_notification(&app_handle, &app_config, &task_name, ExecutionStatus::Timeout, None);
                        return;
                    }
                    thread::sleep(Duration::from_millis(500));
                }
                Err(e) => {
                    let execution = Execution {
                        id: execution_id.clone(),
                        task_id: task_id.clone(),
                        started_at,
                        finished_at: Some(Utc::now().to_rfc3339()),
                        exit_code: Some(-1),
                        stdout: String::new(),
                        stderr: format!("Wait error: {}", e),
                        status: ExecutionStatus::Failed,
                    };
                    save_or_update_execution(&app_config, &task_id, &execution_id, execution);
                    send_notification(&app_handle, &app_config, &task_name, ExecutionStatus::Failed, Some(-1));
                    return;
                }
            }
        }
    });
}

/// Save a new execution or update an existing one (matched by execution_id).
fn save_or_update_execution(
    app_config: &AppConfig,
    task_id: &str,
    execution_id: &str,
    execution: Execution,
) {
    let mut executions = app_config.load_executions(task_id);

    // Try to find and update existing entry
    if let Some(existing) = executions.iter_mut().find(|e| e.id == execution_id) {
        *existing = execution;
    } else {
        executions.push(execution);
    }

    // Purge old executions (only finished ones)
    let max_retention = {
        let config = app_config.config.lock().unwrap();
        config.settings.max_log_retention
    };
    let running_count = executions.iter().filter(|e| e.status == ExecutionStatus::Running).count();
    while executions.len() > max_retention + running_count {
        // Remove oldest finished execution
        if let Some(idx) = executions.iter().position(|e| e.status != ExecutionStatus::Running) {
            executions.remove(idx);
        } else {
            break;
        }
    }

    let _ = app_config.save_executions(task_id, &executions);
}

fn send_notification(
    app_handle: &AppHandle,
    app_config: &AppConfig,
    task_name: &str,
    status: ExecutionStatus,
    exit_code: Option<i32>,
) {
    let notifications_enabled = {
        let config = app_config.config.lock().unwrap();
        config.settings.notifications
    };

    if !notifications_enabled {
        return;
    }

    use tauri_plugin_notification::NotificationExt;
    let (title, body) = match status {
        ExecutionStatus::Success => (
            "CronLab".to_string(),
            format!("\u{2713} {} terminée", task_name),
        ),
        ExecutionStatus::Failed => (
            "CronLab".to_string(),
            format!(
                "\u{2717} {} a échoué (code {})",
                task_name,
                exit_code.unwrap_or(-1)
            ),
        ),
        ExecutionStatus::Timeout => (
            "CronLab".to_string(),
            format!("\u{23F1} {} timeout", task_name),
        ),
        _ => return,
    };

    let _ = app_handle
        .notification()
        .builder()
        .title(&title)
        .body(&body)
        .show();
}
