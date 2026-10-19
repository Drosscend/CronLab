use crate::config::AppConfig;
use crate::models::{Execution, ExecutionStatus};
use chrono::Utc;
use std::io::{self, Read};
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use std::process::{Command, Stdio};
use std::sync::Arc;
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};
use tauri::AppHandle;

/// Bytes of stdout, and of stderr, kept per execution.
const OUTPUT_CAP_BYTES: u64 = 10_000;

/// What a command left behind once it exited, failed or timed out.
struct CommandOutcome {
    status: ExecutionStatus,
    exit_code: Option<i32>,
    stdout: String,
    stderr: String,
}

impl CommandOutcome {
    fn failed(stderr: String) -> Self {
        Self {
            status: ExecutionStatus::Failed,
            exit_code: Some(-1),
            stdout: String::new(),
            stderr,
        }
    }
}

/// Spawn a new thread that runs the given command as a child process.
///
/// The execution lifecycle is: create a "running" log entry, run the command
/// (see [`run_command`]), persist the result, and send a desktop notification.
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

        let (default_timeout, notifications_lang) = {
            let config = match app_config.config.lock() {
                Ok(c) => c,
                Err(_) => {
                    eprintln!("[CronLab] Failed to lock config in executor");
                    return;
                }
            };
            (
                config.settings.default_timeout_seconds,
                config.settings.language.clone(),
            )
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

        let outcome = run_command(&command, &working_directory, &env_vars, Duration::from_secs(timeout));
        let execution = Execution {
            id: execution_id.clone(),
            task_id: task_id.clone(),
            started_at,
            finished_at: Some(Utc::now().to_rfc3339()),
            exit_code: outcome.exit_code,
            stdout: outcome.stdout,
            stderr: outcome.stderr,
            status: outcome.status.clone(),
        };
        save_or_update_execution(&app_config, &task_id, &execution_id, execution);
        send_notification(&app_handle, &app_config, &task_name, outcome.status, outcome.exit_code, &notifications_lang);
    });
}

/// Run `command` until it exits, polling `try_wait()` every 500 ms, or kill its
/// process tree once `timeout` has passed. Stdout and stderr are capped at 10 KB each.
fn run_command(
    command: &str,
    working_directory: &str,
    env_vars: &std::collections::HashMap<String, String>,
    timeout: Duration,
) -> CommandOutcome {
    let parts: Vec<&str> = command.split_whitespace().collect();
    if parts.is_empty() {
        return CommandOutcome::failed("Empty command".to_string());
    }

    let mut cmd = Command::new(parts[0]);
    cmd.args(&parts[1..])
        .current_dir(working_directory)
        .envs(env_vars)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW

    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => return CommandOutcome::failed(format!("Failed to spawn: {}", e)),
    };
    let stdout_reader = capture_output(child.stdout.take());
    let stderr_reader = capture_output(child.stderr.take());

    let start = Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                let exit_code = status.code().unwrap_or(-1);
                let status = if exit_code == 0 {
                    ExecutionStatus::Success
                } else {
                    ExecutionStatus::Failed
                };
                return CommandOutcome {
                    status,
                    exit_code: Some(exit_code),
                    stdout: stdout_reader.join().unwrap_or_default(),
                    stderr: stderr_reader.join().unwrap_or_default(),
                };
            }
            Ok(None) => {
                if start.elapsed() >= timeout {
                    // Kill process tree (not just the parent)
                    kill_process_tree(&mut child);
                    let stdout = stdout_reader.join().unwrap_or_default();
                    let stderr_output = stderr_reader.join().unwrap_or_default();
                    let killed = format!("Process killed after {}s timeout", timeout.as_secs());
                    let stderr = if stderr_output.is_empty() {
                        killed
                    } else {
                        format!("{}\n\n{}", stderr_output, killed)
                    };
                    return CommandOutcome {
                        status: ExecutionStatus::Timeout,
                        exit_code: None,
                        stdout,
                        stderr,
                    };
                }
                thread::sleep(Duration::from_millis(500));
            }
            Err(e) => return CommandOutcome::failed(format!("Wait error: {}", e)),
        }
    }
}

/// Drain a child's output pipe on its own thread, keeping the first `OUTPUT_CAP_BYTES`.
/// A child that fills the pipe buffer blocks until someone reads it.
fn capture_output<R: Read + Send + 'static>(pipe: Option<R>) -> JoinHandle<String> {
    thread::spawn(move || {
        let mut kept = Vec::new();
        if let Some(mut pipe) = pipe {
            let _ = pipe.by_ref().take(OUTPUT_CAP_BYTES).read_to_end(&mut kept);
            let _ = io::copy(&mut pipe, &mut io::sink());
        }
        String::from_utf8_lossy(&kept).into_owned()
    })
}

/// Kill a process and all its children.
/// On Windows, uses `taskkill /T /F /PID` to kill the process tree.
/// On other platforms, falls back to `child.kill()`.
fn kill_process_tree(child: &mut std::process::Child) {
    #[cfg(target_os = "windows")]
    {
        let pid = child.id();
        let _ = Command::new("taskkill")
            .args(["/T", "/F", "/PID", &pid.to_string()])
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .output();
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = child.kill();
    }
    let _ = child.wait();
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
        let config = match app_config.config.lock() {
            Ok(c) => c,
            Err(_) => {
                let _ = app_config.save_executions(task_id, &executions);
                return;
            }
        };
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
    language: &str,
) {
    let notifications_enabled = match app_config.config.lock() {
        Ok(config) => config.settings.notifications,
        Err(_) => return,
    };

    if !notifications_enabled {
        return;
    }

    use tauri_plugin_notification::NotificationExt;
    let body = match (&status, language) {
        (ExecutionStatus::Success, "en") => format!("\u{2713} {} completed", task_name),
        (ExecutionStatus::Success, _) => format!("\u{2713} {} terminée", task_name),
        (ExecutionStatus::Failed, "en") => {
            format!("\u{2717} {} failed (code {})", task_name, exit_code.unwrap_or(-1))
        }
        (ExecutionStatus::Failed, _) => {
            format!("\u{2717} {} a échoué (code {})", task_name, exit_code.unwrap_or(-1))
        }
        (ExecutionStatus::Timeout, "en") => format!("\u{23F1} {} timed out", task_name),
        (ExecutionStatus::Timeout, _) => format!("\u{23F1} {} timeout", task_name),
        _ => return,
    };

    let _ = app_handle
        .notification()
        .builder()
        .title("CronLab")
        .body(&body)
        .show();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(target_os = "windows")]
    #[test]
    fn a_command_writing_more_than_the_pipe_buffer_completes() {
        let outcome = run_command(
            "powershell -NoProfile -Command [Console]::Out.Write('x'*100000)",
            &std::env::temp_dir().to_string_lossy(),
            &std::collections::HashMap::new(),
            Duration::from_secs(15),
        );

        assert_eq!(outcome.status, ExecutionStatus::Success);
        assert_eq!(outcome.stdout.len() as u64, OUTPUT_CAP_BYTES);
    }
}
