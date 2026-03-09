use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// A scheduled CLI task managed by CronLab.
///
/// Tasks are persisted in `~/.cronlab/config.json` and evaluated by the
/// scheduler every 30 seconds. Each task owns its schedule configuration,
/// optional environment variables, and an optional per-task timeout override.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    /// Unique identifier (UUID v4).
    pub id: String,
    /// Human-readable task name, displayed in the UI.
    pub name: String,
    /// Shell command to execute, split by whitespace at runtime.
    pub command: String,
    /// Absolute path used as the process working directory.
    pub working_directory: String,
    /// Schedule configuration determining when the task runs.
    pub schedule: Schedule,
    /// Whether the scheduler should evaluate this task. Disabled tasks are skipped.
    pub enabled: bool,
    /// Additional environment variables injected into the spawned process.
    pub env_vars: HashMap<String, String>,
    /// Per-task timeout in seconds. Falls back to `Settings::default_timeout_seconds` if `None`.
    pub timeout_seconds: Option<u64>,
    /// RFC 3339 timestamp of when the task was first created.
    pub created_at: String,
    /// RFC 3339 timestamp of the last modification.
    pub updated_at: String,
}

/// Defines when and how often a task should run.
///
/// Only the fields relevant to the chosen `schedule_type` are used at runtime;
/// the rest are ignored by the scheduler.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Schedule {
    /// Discriminant serialized as `"type"` in JSON.
    #[serde(rename = "type")]
    pub schedule_type: ScheduleType,
    /// Time of day in `"HH:MM"` format. Used by `Daily` and `Weekly` schedules.
    pub time: Option<String>,
    /// Days of the week (1 = Monday, 7 = Sunday). Used by `Weekly` schedules.
    pub days_of_week: Option<Vec<u8>>,
    /// Interval in minutes between runs. Used by `Hourly` schedules (default: 60).
    pub interval_minutes: Option<u32>,
    /// Standard cron expression (6 or 7 fields). Used by `CustomCron` schedules.
    pub cron_expression: Option<String>,
}

/// The type of recurrence for a schedule.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ScheduleType {
    /// Run once every day at a fixed time.
    Daily,
    /// Run at a fixed interval (in minutes) throughout the day.
    Hourly,
    /// Run on specific days of the week at a fixed time.
    Weekly,
    /// Run according to a standard cron expression.
    CustomCron,
}

/// A single execution record for a task.
///
/// Executions are stored per-task in `~/.cronlab/logs/{taskId}.json`.
/// While a process is running, `finished_at` and `exit_code` are `None`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Execution {
    /// Unique identifier (UUID v4) for this execution.
    pub id: String,
    /// Reference to the parent `Task::id`.
    pub task_id: String,
    /// RFC 3339 timestamp of when the process was spawned.
    pub started_at: String,
    /// RFC 3339 timestamp of when the process exited. `None` while running.
    pub finished_at: Option<String>,
    /// Process exit code. `None` while running or on timeout.
    pub exit_code: Option<i32>,
    /// Captured standard output (truncated to 10 KB).
    pub stdout: String,
    /// Captured standard error (truncated to 10 KB).
    pub stderr: String,
    /// Current lifecycle status of this execution.
    pub status: ExecutionStatus,
}

/// Lifecycle status of a task execution.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ExecutionStatus {
    /// The process is still running.
    Running,
    /// The process exited with code 0.
    Success,
    /// The process exited with a non-zero code or failed to spawn.
    Failed,
    /// The process was killed because it exceeded its timeout.
    Timeout,
}

/// Application-wide settings persisted in `config.json`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    /// UI language (`"fr"` or `"en"`).
    pub language: String,
    /// Register the app to start automatically with the OS.
    pub launch_at_startup: bool,
    /// Hide the window to the system tray instead of quitting on close.
    pub close_to_tray: bool,
    /// Fallback timeout in seconds for tasks that don't define their own.
    pub default_timeout_seconds: u64,
    /// Maximum number of finished execution records kept per task.
    pub max_log_retention: usize,
    /// Enable native desktop notifications on task completion.
    pub notifications: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            language: "fr".to_string(),
            launch_at_startup: true,
            close_to_tray: true,
            default_timeout_seconds: 1800,
            max_log_retention: 10,
            notifications: true,
        }
    }
}

/// Root configuration object serialized to `~/.cronlab/config.json`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    /// Schema version for future migration support.
    pub version: u32,
    /// Application-wide settings.
    pub settings: Settings,
    /// All registered tasks.
    pub tasks: Vec<Task>,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            version: 1,
            settings: Settings::default(),
            tasks: Vec::new(),
        }
    }
}

/// Input payload received from the frontend when creating or updating a task.
///
/// Unlike `Task`, this struct omits server-generated fields (`id`, `enabled`,
/// `created_at`, `updated_at`) which are set by the backend.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskInput {
    pub name: String,
    pub command: String,
    pub working_directory: String,
    pub schedule: Schedule,
    pub env_vars: HashMap<String, String>,
    pub timeout_seconds: Option<u64>,
}
