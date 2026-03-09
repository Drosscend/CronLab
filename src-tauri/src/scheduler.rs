use crate::config::AppConfig;
use crate::executor::execute_task;
use crate::models::ScheduleType;
use chrono::{Datelike, Local, NaiveTime, Timelike};
use cron::Schedule as CronSchedule;
use std::collections::HashMap;
use std::str::FromStr;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::AppHandle;

pub struct SchedulerState {
    pub last_triggered: Mutex<HashMap<String, String>>,
}

impl SchedulerState {
    pub fn new() -> Self {
        Self {
            last_triggered: Mutex::new(HashMap::new()),
        }
    }
}

pub fn start_scheduler(app_handle: AppHandle, app_config: Arc<AppConfig>, scheduler_state: Arc<SchedulerState>) {
    thread::spawn(move || loop {
        thread::sleep(Duration::from_secs(30));
        check_and_run_tasks(&app_handle, &app_config, &scheduler_state);
    });
}

fn check_and_run_tasks(
    app_handle: &AppHandle,
    app_config: &Arc<AppConfig>,
    scheduler_state: &SchedulerState,
) {
    let tasks = {
        let config = app_config.config.lock().unwrap();
        config.tasks.clone()
    };

    let now = Local::now();

    for task in &tasks {
        if !task.enabled {
            continue;
        }

        if let Some(next_run) = compute_next_run(&task.schedule) {
            let next_dt = chrono::DateTime::parse_from_rfc3339(&next_run);
            if let Ok(next_dt) = next_dt {
                let next_local = next_dt.with_timezone(&Local);
                if next_local <= now {
                    let slot_key = format!("{}_{}", task.id, next_run);
                    let mut last_triggered = scheduler_state.last_triggered.lock().unwrap();

                    if last_triggered.contains_key(&slot_key) {
                        continue;
                    }

                    last_triggered.insert(slot_key, now.to_rfc3339());

                    // Clean old entries (keep only last 100)
                    if last_triggered.len() > 100 {
                        let keys: Vec<String> = last_triggered.keys().cloned().collect();
                        for key in keys.iter().take(last_triggered.len() - 50) {
                            last_triggered.remove(key);
                        }
                    }

                    execute_task(
                        app_handle.clone(),
                        Arc::clone(app_config),
                        task.id.clone(),
                        task.command.clone(),
                        task.working_directory.clone(),
                        task.env_vars.clone(),
                        task.timeout_seconds,
                        task.name.clone(),
                    );
                }
            }
        }
    }
}

pub fn compute_next_run(schedule: &crate::models::Schedule) -> Option<String> {
    let now = Local::now();

    match schedule.schedule_type {
        ScheduleType::Daily => {
            let time_str = schedule.time.as_deref()?;
            let time = NaiveTime::parse_from_str(time_str, "%H:%M").ok()?;
            let today = now.date_naive().and_time(time);
            let today_local = Local::now()
                .timezone()
                .from_local_datetime(&today)
                .single()?;

            if today_local > now {
                Some(today_local.to_rfc3339())
            } else {
                let tomorrow = today + chrono::Duration::days(1);
                let tomorrow_local = Local::now()
                    .timezone()
                    .from_local_datetime(&tomorrow)
                    .single()?;
                Some(tomorrow_local.to_rfc3339())
            }
        }
        ScheduleType::Hourly => {
            let interval = schedule.interval_minutes.unwrap_or(60) as i64;
            let minutes_since_midnight =
                now.hour() as i64 * 60 + now.minute() as i64;
            let current_slot = (minutes_since_midnight / interval) * interval;
            let next_slot = current_slot + interval;

            let next_hour = (next_slot / 60) as u32;
            let next_minute = (next_slot % 60) as u32;

            if next_hour < 24 {
                let next_time = NaiveTime::from_hms_opt(next_hour, next_minute, 0)?;
                let next_dt = now.date_naive().and_time(next_time);
                let next_local = Local::now()
                    .timezone()
                    .from_local_datetime(&next_dt)
                    .single()?;
                Some(next_local.to_rfc3339())
            } else {
                // Next day at 00:00 + remainder
                let remainder_minutes = next_slot - 24 * 60;
                let next_time =
                    NaiveTime::from_hms_opt((remainder_minutes / 60) as u32, (remainder_minutes % 60) as u32, 0)?;
                let tomorrow = now.date_naive() + chrono::Duration::days(1);
                let next_dt = tomorrow.and_time(next_time);
                let next_local = Local::now()
                    .timezone()
                    .from_local_datetime(&next_dt)
                    .single()?;
                Some(next_local.to_rfc3339())
            }
        }
        ScheduleType::Weekly => {
            let time_str = schedule.time.as_deref()?;
            let time = NaiveTime::parse_from_str(time_str, "%H:%M").ok()?;
            let days = schedule.days_of_week.as_ref()?;

            // Find the next matching day
            for offset in 0..8 {
                let check_date = now.date_naive() + chrono::Duration::days(offset);
                let weekday = check_date.weekday().num_days_from_monday() as u8 + 1; // 1=Monday

                if days.contains(&weekday) {
                    let dt = check_date.and_time(time);
                    let local = Local::now()
                        .timezone()
                        .from_local_datetime(&dt)
                        .single()?;

                    if local > now {
                        return Some(local.to_rfc3339());
                    }
                }
            }
            None
        }
        ScheduleType::CustomCron => {
            let expr = schedule.cron_expression.as_deref()?;
            let cron_schedule = CronSchedule::from_str(expr).ok()?;
            let next = cron_schedule.upcoming(Local).next()?;
            Some(next.to_rfc3339())
        }
    }
}

use chrono::TimeZone;
