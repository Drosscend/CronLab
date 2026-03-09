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

        // Parse command - split on spaces, respecting the first token as the program
        let parts: Vec<&str> = command.split_whitespace().collect();
        if parts.is_empty() {
            save_failed_execution(
                &app_config,
                &execution_id,
                &task_id,
                &started_at,
                "Empty command".to_string(),
            );
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
                save_failed_execution(
                    &app_config,
                    &execution_id,
                    &task_id,
                    &started_at,
                    format!("Failed to spawn: {}", e),
                );
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
                    // Process finished
                    let finished_at = Utc::now().to_rfc3339();
                    let exit_code = status.code().unwrap_or(-1);

                    let stdout = child
                        .stdout
                        .take()
                        .map(|out| {
                            let mut buf = String::new();
                            use std::io::Read;
                            let mut reader = out;
                            let _ = reader.read_to_string(&mut buf);
                            truncate_string(buf, 10000)
                        })
                        .unwrap_or_default();

                    let stderr = child
                        .stderr
                        .take()
                        .map(|err| {
                            let mut buf = String::new();
                            use std::io::Read;
                            let mut reader = err;
                            let _ = reader.read_to_string(&mut buf);
                            truncate_string(buf, 10000)
                        })
                        .unwrap_or_default();

                    let exec_status = if exit_code == 0 {
                        ExecutionStatus::Success
                    } else {
                        ExecutionStatus::Failed
                    };

                    let execution = Execution {
                        id: execution_id,
                        task_id: task_id.clone(),
                        started_at,
                        finished_at: Some(finished_at),
                        exit_code: Some(exit_code),
                        stdout,
                        stderr,
                        status: exec_status.clone(),
                    };

                    save_execution(&app_config, &task_id, execution);
                    send_notification(&app_handle, &app_config, &task_name, exec_status, Some(exit_code));
                    return;
                }
                Ok(None) => {
                    // Still running
                    if start.elapsed() >= timeout_duration {
                        // Timeout - kill the process
                        let _ = child.kill();
                        let _ = child.wait();
                        let finished_at = Utc::now().to_rfc3339();

                        let execution = Execution {
                            id: execution_id,
                            task_id: task_id.clone(),
                            started_at,
                            finished_at: Some(finished_at),
                            exit_code: None,
                            stdout: String::new(),
                            stderr: format!("Process killed after {}s timeout", timeout),
                            status: ExecutionStatus::Timeout,
                        };

                        save_execution(&app_config, &task_id, execution);
                        send_notification(&app_handle, &app_config, &task_name, ExecutionStatus::Timeout, None);
                        return;
                    }
                    thread::sleep(Duration::from_millis(500));
                }
                Err(e) => {
                    save_failed_execution(
                        &app_config,
                        &execution_id,
                        &task_id,
                        &started_at,
                        format!("Wait error: {}", e),
                    );
                    send_notification(&app_handle, &app_config, &task_name, ExecutionStatus::Failed, Some(-1));
                    return;
                }
            }
        }
    });
}

fn save_failed_execution(
    app_config: &AppConfig,
    execution_id: &str,
    task_id: &str,
    started_at: &str,
    error: String,
) {
    let execution = Execution {
        id: execution_id.to_string(),
        task_id: task_id.to_string(),
        started_at: started_at.to_string(),
        finished_at: Some(Utc::now().to_rfc3339()),
        exit_code: Some(-1),
        stdout: String::new(),
        stderr: error,
        status: ExecutionStatus::Failed,
    };
    save_execution(app_config, task_id, execution);
}

fn save_execution(app_config: &AppConfig, task_id: &str, execution: Execution) {
    let mut executions = app_config.load_executions(task_id);
    executions.push(execution);

    // Purge old executions
    let max_retention = {
        let config = app_config.config.lock().unwrap();
        config.settings.max_log_retention
    };
    while executions.len() > max_retention {
        executions.remove(0);
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
            format!("✓ {} terminée", task_name),
        ),
        ExecutionStatus::Failed => (
            "CronLab".to_string(),
            format!(
                "✗ {} a échoué (code {})",
                task_name,
                exit_code.unwrap_or(-1)
            ),
        ),
        ExecutionStatus::Timeout => (
            "CronLab".to_string(),
            format!("⏱ {} timeout", task_name),
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

fn truncate_string(s: String, max_len: usize) -> String {
    if s.len() > max_len {
        s[..max_len].to_string()
    } else {
        s
    }
}
