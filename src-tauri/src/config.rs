use crate::models::{Config, Execution};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct AppConfig {
    pub config: Mutex<Config>,
    config_path: PathBuf,
    logs_dir: PathBuf,
}

impl AppConfig {
    pub fn new() -> Self {
        let base_dir = dirs::home_dir()
            .expect("Cannot find home directory")
            .join(".cronlab");

        let config_path = base_dir.join("config.json");
        let logs_dir = base_dir.join("logs");

        // Create directories
        fs::create_dir_all(&logs_dir).expect("Cannot create .cronlab/logs directory");

        // Load or create config
        let config = if config_path.exists() {
            let content = fs::read_to_string(&config_path).unwrap_or_default();
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            let config = Config::default();
            let content = serde_json::to_string_pretty(&config).unwrap();
            fs::write(&config_path, content).expect("Cannot write config.json");
            config
        };

        Self {
            config: Mutex::new(config),
            config_path,
            logs_dir,
        }
    }

    pub fn save(&self) -> Result<(), String> {
        let config = self.config.lock().map_err(|e| e.to_string())?;
        let content = serde_json::to_string_pretty(&*config).map_err(|e| e.to_string())?;
        fs::write(&self.config_path, content).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_log_path(&self, task_id: &str) -> PathBuf {
        self.logs_dir.join(format!("{}.json", task_id))
    }

    pub fn load_executions(&self, task_id: &str) -> Vec<Execution> {
        let path = self.get_log_path(task_id);
        if path.exists() {
            let content = fs::read_to_string(&path).unwrap_or_default();
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            Vec::new()
        }
    }

    pub fn save_executions(&self, task_id: &str, executions: &[Execution]) -> Result<(), String> {
        let path = self.get_log_path(task_id);
        let content = serde_json::to_string_pretty(executions).map_err(|e| e.to_string())?;
        fs::write(path, content).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn delete_log(&self, task_id: &str) {
        let path = self.get_log_path(task_id);
        let _ = fs::remove_file(path);
    }
}
