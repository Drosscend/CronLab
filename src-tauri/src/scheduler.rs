use crate::config::AppConfig;
use crate::executor::execute_task;
use crate::models::ScheduleType;
use chrono::{Datelike, DateTime, Local, NaiveDateTime, NaiveTime, TimeZone, Timelike};
use cron::Schedule as CronSchedule;
use std::collections::HashMap;
use std::str::FromStr;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::AppHandle;

/// Maximum seconds after a scheduled slot during which it can still trigger.
/// Must be larger than the polling interval (30s) to guarantee the slot is caught.
const TRIGGER_WINDOW_SECS: i64 = 300;

/// Tracks which schedule slots have already been triggered to prevent
/// duplicate executions within the same scheduling window.
pub struct SchedulerState {
    /// Keys are `"{task_id}_{slot_rfc3339}"`, values are trigger timestamps.
    pub last_triggered: Mutex<HashMap<String, String>>,
}

impl SchedulerState {
    pub fn new() -> Self {
        Self {
            last_triggered: Mutex::new(HashMap::new()),
        }
    }
}

/// Spawn a background thread that checks all enabled tasks every 30 seconds
/// and triggers execution for any task whose next run time is in the past.
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
        let config = match app_config.config.lock() {
            Ok(c) => c,
            Err(_) => {
                eprintln!("[CronLab] Failed to lock config in scheduler");
                return;
            }
        };
        config.tasks.clone()
    };

    let now = Local::now();

    for task in &tasks {
        if !task.enabled {
            continue;
        }

        if let Some(slot) = compute_triggerable_slot(&task.schedule, &now) {
            let slot_key = format!("{}_{}", task.id, slot.to_rfc3339());
            let mut last_triggered = match scheduler_state.last_triggered.lock() {
                Ok(lt) => lt,
                Err(_) => continue,
            };

            if last_triggered.contains_key(&slot_key) {
                continue;
            }

            last_triggered.insert(slot_key, now.to_rfc3339());

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

/// Convert a naive datetime to a local timezone-aware datetime.
fn to_local(naive: NaiveDateTime) -> Option<DateTime<Local>> {
    Local.from_local_datetime(&naive).single()
}

/// Return a slot that should be triggered right now, or `None` if no slot is due.
///
/// A slot is "triggerable" if its scheduled time is in the past but within
/// [`TRIGGER_WINDOW_SECS`]. The dedup map in [`SchedulerState`] prevents
/// re-execution within the same window.
fn compute_triggerable_slot(
    schedule: &crate::models::Schedule,
    now: &DateTime<Local>,
) -> Option<DateTime<Local>> {
    match schedule.schedule_type {
        ScheduleType::Daily => {
            let time = parse_time(schedule.time.as_deref()?)?;
            let today = to_local(now.date_naive().and_time(time))?;

            if is_within_window(now, &today) {
                Some(today)
            } else {
                None
            }
        }
        ScheduleType::Hourly => {
            let interval = schedule.interval_minutes.unwrap_or(60) as i64;
            let minutes_since_midnight = now.hour() as i64 * 60 + now.minute() as i64;
            let current_slot_minutes = (minutes_since_midnight / interval) * interval;

            let slot_hour = (current_slot_minutes / 60) as u32;
            let slot_minute = (current_slot_minutes % 60) as u32;
            let slot_time = NaiveTime::from_hms_opt(slot_hour, slot_minute, 0)?;
            let slot = to_local(now.date_naive().and_time(slot_time))?;

            if is_within_window(now, &slot) {
                Some(slot)
            } else {
                None
            }
        }
        ScheduleType::Weekly => {
            let time = parse_time(schedule.time.as_deref()?)?;
            let days = schedule.days_of_week.as_ref()?;
            let weekday = now.date_naive().weekday().num_days_from_monday() as u8 + 1;

            if days.contains(&weekday) {
                let slot = to_local(now.date_naive().and_time(time))?;
                if is_within_window(now, &slot) {
                    return Some(slot);
                }
            }
            None
        }
        ScheduleType::CustomCron => {
            let expr = schedule.cron_expression.as_deref()?;
            let cron_schedule = CronSchedule::from_str(expr).ok()?;
            let next = cron_schedule.upcoming(now.timezone()).next()?;
            if next <= *now {
                Some(next)
            } else {
                None
            }
        }
    }
}

/// Check if `slot` is due: it's in the past (or now) but within the trigger window.
fn is_within_window(now: &DateTime<Local>, slot: &DateTime<Local>) -> bool {
    let elapsed = now.signed_duration_since(*slot).num_seconds();
    elapsed >= 0 && elapsed < TRIGGER_WINDOW_SECS
}

fn parse_time(s: &str) -> Option<NaiveTime> {
    NaiveTime::parse_from_str(s, "%H:%M").ok()
}

/// Compute the next scheduled run time for UI display purposes.
/// Returns an RFC 3339 timestamp or `None` if the schedule is invalid.
pub fn compute_next_run(schedule: &crate::models::Schedule) -> Option<String> {
    let now = Local::now();

    match schedule.schedule_type {
        ScheduleType::Daily => {
            let time = parse_time(schedule.time.as_deref()?)?;
            let today = to_local(now.date_naive().and_time(time))?;

            if today > now {
                Some(today.to_rfc3339())
            } else {
                let tomorrow = now.date_naive().succ_opt()?.and_time(time);
                Some(to_local(tomorrow)?.to_rfc3339())
            }
        }
        ScheduleType::Hourly => {
            let interval = schedule.interval_minutes.unwrap_or(60) as i64;
            let minutes_since_midnight = now.hour() as i64 * 60 + now.minute() as i64;
            let next_slot = ((minutes_since_midnight / interval) + 1) * interval;

            let next_hour = (next_slot / 60) as u32;
            let next_minute = (next_slot % 60) as u32;

            if next_hour < 24 {
                let next_time = NaiveTime::from_hms_opt(next_hour, next_minute, 0)?;
                Some(to_local(now.date_naive().and_time(next_time))?.to_rfc3339())
            } else {
                let remainder = next_slot - 24 * 60;
                let next_time = NaiveTime::from_hms_opt((remainder / 60) as u32, (remainder % 60) as u32, 0)?;
                let tomorrow = now.date_naive().succ_opt()?.and_time(next_time);
                Some(to_local(tomorrow)?.to_rfc3339())
            }
        }
        ScheduleType::Weekly => {
            let time = parse_time(schedule.time.as_deref()?)?;
            let days = schedule.days_of_week.as_ref()?;

            for offset in 0..8 {
                let check_date = now.date_naive() + chrono::Duration::days(offset);
                let weekday = check_date.weekday().num_days_from_monday() as u8 + 1;

                if days.contains(&weekday) {
                    let local = to_local(check_date.and_time(time))?;
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
