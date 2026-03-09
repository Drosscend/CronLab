mod commands;
mod config;
mod executor;
mod models;
mod notifications;
mod scheduler;

use config::AppConfig;
use scheduler::{start_scheduler, SchedulerState};
use std::sync::Arc;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_config = Arc::new(AppConfig::new());
    let scheduler_state = Arc::new(SchedulerState::new());

    let app_config_for_manage = Arc::clone(&app_config);
    let app_config_for_setup = Arc::clone(&app_config);
    let scheduler_state_clone = Arc::clone(&scheduler_state);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .manage(app_config_for_manage)
        .invoke_handler(tauri::generate_handler![
            commands::get_tasks,
            commands::create_task,
            commands::update_task,
            commands::delete_task,
            commands::toggle_task,
            commands::run_task_now,
            commands::get_executions,
            commands::get_next_run,
            commands::get_settings,
            commands::update_settings,
        ])
        .setup(move |app| {
            // Build tray menu
            let open_item = MenuItemBuilder::with_id("open", "Ouvrir CronLab").build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "Quitter").build(app)?;
            let menu = MenuBuilder::new(app)
                .items(&[&open_item, &quit_item])
                .separator()
                .build()?;

            // Count active tasks for tooltip
            let active_count = {
                let config = app_config_for_setup.config.lock().unwrap();
                config.tasks.iter().filter(|t| t.enabled).count()
            };

            let _tray = TrayIconBuilder::new()
                .tooltip(&format!("CronLab - {} tâche(s) active(s)", active_count))
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "open" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.unminimize();
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.unminimize();
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // Handle close-to-tray behavior
            let app_handle = app.handle().clone();
            let app_config_for_close = Arc::clone(&app_config_for_setup);
            if let Some(window) = app.get_webview_window("main") {
                window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        let close_to_tray = {
                            let config = app_config_for_close.config.lock().unwrap();
                            config.settings.close_to_tray
                        };

                        if close_to_tray {
                            api.prevent_close();
                            if let Some(w) = app_handle.get_webview_window("main") {
                                let _ = w.hide();
                            }
                        }
                    }
                });
            }

            // Start scheduler
            start_scheduler(
                app.handle().clone(),
                Arc::clone(&app_config_for_setup),
                scheduler_state_clone,
            );

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
