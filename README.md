# CronLab

A desktop CLI task scheduler for Windows 11 with system tray, native notifications, and a modern Fluent UI interface.

![Screenshot](docs/screenshot.png)

## Features

- Schedule CLI commands with daily, hourly, weekly, or custom cron expressions
- Run tasks manually with one click
- Per-task environment variables and timeout override
- Execution history with captured stdout/stderr (last 10 runs by default)
- Native Windows notifications on task completion, failure, or timeout
- System tray with close-to-tray behavior
- Auto-start with Windows
- Bilingual interface (French / English)
- Human-editable JSON configuration for easy import/export

## Prerequisites

| Tool | Version |
|------|---------|
| [Rust](https://rustup.rs/) | 1.77+ |
| [Node.js](https://nodejs.org/) | 20+ |
| [Bun](https://bun.sh/) | 1.0+ |
| [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) | 2022+ |
| WebView2 | Bundled with Windows 11 |

## Installation & Development

```bash
git clone <repo-url> cronlab
cd cronlab
bun install
```

**Development** (hot reload on both frontend and backend):

```bash
bun run tauri dev
```

**Production build** (generates an installer in `src-tauri/target/release/bundle/`):

```bash
bun run tauri build
```

## Configuration

CronLab stores all data in `~/.cronlab/`:

```
~/.cronlab/
├── config.json          # Tasks + settings
└── logs/
    └── {taskId}.json    # Execution history per task
```

`config.json` is human-readable JSON containing a `settings` object and a `tasks` array. You can edit it manually, copy it to another machine for migration, or back it up.

Example task entry:

```json
{
  "name": "Daily DB backup",
  "command": "pg_dump -U postgres mydb > backup.sql",
  "workingDirectory": "C:\\Backups\\db",
  "schedule": { "type": "daily", "time": "03:00" },
  "enabled": true,
  "envVars": { "PGPASSWORD": "s3cret" },
  "timeoutSeconds": 3600
}
```

See [docs/CONFIG.md](docs/CONFIG.md) for the full schema reference.

## Tech Stack

| Technology | Role |
|------------|------|
| [Tauri 2](https://v2.tauri.app/) | Desktop framework (Rust ↔ WebView IPC) |
| [Rust](https://www.rust-lang.org/) | Backend: scheduling, process execution, config persistence |
| [React 19](https://react.dev/) | Frontend UI |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe frontend code |
| [Fluent UI v9](https://react.fluentui.dev/) | Microsoft design system components |
| [Vite](https://vite.dev/) | Frontend build tool |
| [Bun](https://bun.sh/) | Package manager |
| [chrono](https://crates.io/crates/chrono) + [cron](https://crates.io/crates/cron) | Schedule computation |

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — system design, module roles, data flow, concurrency model
- [Configuration](docs/CONFIG.md) — full config.json schema, execution logs format, import/export
- [Development](docs/DEVELOPMENT.md) — setup, project structure, how to add commands and translations

## License

[MIT](LICENSE)
