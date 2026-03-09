use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    pub name: String,
    pub command: String,
    pub working_directory: String,
    pub schedule: Schedule,
    pub enabled: bool,
    pub env_vars: HashMap<String, String>,
    pub timeout_seconds: Option<u64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Schedule {
    #[serde(rename = "type")]
    pub schedule_type: ScheduleType,
    pub time: Option<String>,
    pub days_of_week: Option<Vec<u8>>,
    pub interval_minutes: Option<u32>,
    pub cron_expression: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ScheduleType {
    Daily,
    Hourly,
    Weekly,
    CustomCron,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Execution {
    pub id: String,
    pub task_id: String,
    pub started_at: String,
    pub finished_at: Option<String>,
    pub exit_code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
    pub status: ExecutionStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ExecutionStatus {
    Running,
    Success,
    Failed,
    Timeout,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub language: String,
    pub launch_at_startup: bool,
    pub close_to_tray: bool,
    pub default_timeout_seconds: u64,
    pub max_log_retention: usize,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    pub version: u32,
    pub settings: Settings,
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
