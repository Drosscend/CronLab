# Architecture

## Overview

```
┌──────────────────────────────────────────────────────┐
│                    React Frontend                     │
│  Components ─── Hooks ─── i18n ─── Fluent UI theme   │
└──────────────────────┬───────────────────────────────┘
                       │ tauri::invoke (IPC)
┌──────────────────────▼───────────────────────────────┐
│                  Tauri Commands                       │
│              commands.rs (10 handlers)                │
└───────┬──────────────┬───────────────┬───────────────┘
        │              │               │
┌───────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
│  AppConfig   │ │ Scheduler │ │  Executor   │
│  config.rs   │ │scheduler.rs│ │ executor.rs │
│  (Mutex)     │ │(30s loop) │ │ (threads)   │
└───────┬──────┘ └─────┬─────┘ └──────┬──────┘
        │              │               │
┌───────▼──────────────▼───────────────▼───────────────┐
│                   Filesystem                          │
│  ~/.cronlab/config.json    ~/.cronlab/logs/*.json     │
└──────────────────────────────────────────────────────┘
```

## Backend Modules (Rust)

### `models.rs`
Data structures shared across the backend: `Task`, `Schedule`, `ScheduleType`, `Execution`, `ExecutionStatus`, `Settings`, `Config`, and `TaskInput`. All structs derive `Serialize`/`Deserialize` with camelCase field renaming for JSON interop with the frontend.

### `config.rs`
Manages the `~/.cronlab/` directory. `AppConfig` wraps the `Config` struct in a `Mutex` and provides methods to load, save, and query both the configuration file and per-task execution logs. Created at startup and shared via `Arc` across all threads.

### `commands.rs`
Ten `#[tauri::command]` handlers that form the IPC API. Each handler acquires a lock on `AppConfig`, performs CRUD or query operations, and persists changes to disk. This is the only module the frontend communicates with directly.

### `scheduler.rs`
Background polling loop that runs every 30 seconds in a dedicated thread. For each enabled task, it computes the next run time (`compute_next_run`) and triggers execution if the time has passed. Uses `SchedulerState` (a `Mutex<HashMap>`) to deduplicate triggers within the same scheduling slot.

### `executor.rs`
Spawns a new OS thread per task execution. The child process is monitored via `try_wait()` every 500 ms. Captures stdout/stderr (capped at 10 KB), enforces a timeout (kills the process if exceeded), persists execution records to the log file, and sends a desktop notification on completion.

### `notifications.rs`
Reserved module. Notifications are currently handled inline in `executor.rs` via `tauri_plugin_notification`.

### `lib.rs`
Application entry point. Initializes Tauri with plugins (opener, notification, autostart, dialog), registers all command handlers, sets up the system tray with a context menu, implements close-to-tray behavior, and starts the scheduler thread.

## Frontend (React + TypeScript)

### Components

| Component | Role |
|-----------|------|
| `App.tsx` | Root component. Manages view state (tasks / settings), provides Fluent UI theme and i18n context |
| `Header.tsx` | Top bar with "New task" and "Settings" buttons |
| `TaskList.tsx` | Searchable, sortable list of tasks. Filters by name and sorts by next run / name / creation date |
| `TaskRow.tsx` | Single task row: name, countdown, status badge, toggle switch, run button, and action menu |
| `TaskForm.tsx` | Dialog for creating or editing a task. Dynamic fields based on schedule type |
| `TaskAdvanced.tsx` | Collapsible section for environment variables and timeout override |
| `TimePicker.tsx` | Custom HH:MM picker with arrow buttons and keyboard support |
| `ExecutionLog.tsx` | Dialog listing past executions with expandable stdout/stderr output |
| `SettingsPanel.tsx` | Full-screen settings view: language, startup, tray, notifications, timeout, log retention |

### Hooks

| Hook | Role |
|------|------|
| `useTasks` | Task CRUD state. Fetches on mount, exposes `create`, `update`, `remove`, `toggle`, `runNow`, `reload` |
| `useSettings` | Settings state. Fetches on mount, exposes `save` and `reload` |
| `useCountdown` | Computes a human-readable countdown to the next run. Fetches next run every 30 s, updates label every 1 s |
| `useTheme` | Detects system dark/light preference via `matchMedia` and listens for changes |

### Other

| Module | Role |
|--------|------|
| `lib/types.ts` | Shared TypeScript interfaces mirroring the Rust models |
| `lib/tauri.ts` | Typed wrappers around `invoke()` for all 10 backend commands |
| `i18n/index.ts` | Translation context and `translate()` function with parameter interpolation |
| `i18n/fr.json`, `i18n/en.json` | French and English translation strings (~75 keys each) |
| `styles/global.css` | Base styles: font, scrollbar, dialog radius override |

## Data Flow: Task Lifecycle

1. **Creation**: User fills `TaskForm` → `createTask()` invoke → `commands::create_task` generates UUID + timestamps, appends to config, saves to disk.
2. **Storage**: Task is written to `~/.cronlab/config.json` as part of the `tasks` array.
3. **Scheduling**: Every 30 seconds, `scheduler.rs` reads all tasks, calls `compute_next_run()` for each enabled task, and compares with the current time.
4. **Execution**: When a task is due (or manually triggered via "Run now"), `execute_task()` spawns an OS thread → spawns a child process → polls `try_wait()` every 500 ms.
5. **Logging**: A "running" execution record is created immediately. On completion, it is updated with exit code, stdout, stderr, and final status. Old records are pruned per `maxLogRetention`.
6. **Notification**: On completion, a native OS notification is sent (if enabled) with the task name and result.
7. **UI update**: `TaskRow` polls execution status every 2 s while a task is running. `useCountdown` refreshes the next-run time every 30 s.

## Concurrency Model

CronLab runs three categories of threads:

1. **Main thread** — Tauri event loop, window management, tray icon.
2. **Scheduler thread** — Single long-lived thread, sleeps 30 s between ticks.
3. **Executor threads** — One short-lived thread per task execution, spawned on demand.

All threads share `Arc<AppConfig>` which wraps the config in a `Mutex<Config>`. Lock contention is low because:
- The scheduler clones the task list immediately after acquiring the lock, then releases it.
- Command handlers hold the lock only for the duration of a single read or write.
- Executor threads only lock briefly to read `default_timeout_seconds` or to save execution records.

`SchedulerState` uses a separate `Mutex<HashMap>` to track triggered slots. It is cleaned up to 50 entries when it exceeds 100, preventing unbounded growth.

File I/O (config and logs) is performed under the config lock or within a single executor thread, so there are no concurrent writes to the same file.
