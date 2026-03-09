# Development Guide

## Prerequisites

| Tool | Minimum version | Install |
|------|-----------------|---------|
| Rust | 1.77+ | [rustup.rs](https://rustup.rs/) |
| Node.js | 20+ | [nodejs.org](https://nodejs.org/) |
| Bun | 1.0+ | [bun.sh](https://bun.sh/) (used as package manager) |
| Tauri CLI | 2.x | Installed via `devDependencies` |

On Windows, you also need the [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and WebView2 (bundled with Windows 11).

## Setup

```bash
git clone <repo-url> cronlab
cd cronlab
bun install
bun run tauri dev
```

`tauri dev` starts both the Vite dev server (port 1420) and the Rust backend with hot reload.

## Project Structure

```
cronlab/
├── src/                          # React frontend
│   ├── main.tsx                  # Entry point
│   ├── App.tsx                   # Root component, state & providers
│   ├── components/
│   │   ├── Header.tsx            # Top bar (new task, settings)
│   │   ├── TaskList.tsx          # Searchable/sortable task grid
│   │   ├── TaskRow.tsx           # Single task row with actions
│   │   ├── TaskForm.tsx          # Create/edit dialog
│   │   ├── TaskAdvanced.tsx      # Env vars & timeout section
│   │   ├── TimePicker.tsx        # HH:MM picker
│   │   ├── ExecutionLog.tsx      # Execution history dialog
│   │   └── SettingsPanel.tsx     # Settings view
│   ├── hooks/
│   │   ├── useTasks.ts           # Task CRUD state
│   │   ├── useSettings.ts        # Settings state
│   │   ├── useCountdown.ts       # Next-run countdown
│   │   └── useTheme.ts           # System theme detection
│   ├── lib/
│   │   ├── types.ts              # Shared TypeScript interfaces
│   │   └── tauri.ts              # Typed invoke() wrappers
│   ├── i18n/
│   │   ├── index.ts              # Translation context & function
│   │   ├── fr.json               # French strings
│   │   └── en.json               # English strings
│   └── styles/
│       └── global.css            # Base styles
├── src-tauri/                    # Rust backend
│   ├── Cargo.toml                # Rust dependencies
│   ├── tauri.conf.json           # Tauri app config (window, bundle, etc.)
│   ├── capabilities/
│   │   └── default.json          # Tauri permission capabilities
│   ├── icons/                    # App icons (all sizes)
│   └── src/
│       ├── main.rs               # OS entry point
│       ├── lib.rs                # Tauri setup, tray, plugins
│       ├── models.rs             # Data structures
│       ├── config.rs             # Config & log file management
│       ├── commands.rs           # 10 Tauri IPC command handlers
│       ├── scheduler.rs          # Background task scheduler
│       ├── executor.rs           # Process spawning & monitoring
│       └── notifications.rs      # Reserved for future use
├── package.json                  # Node dependencies & scripts
├── tsconfig.json                 # TypeScript config
├── vite.config.ts                # Vite config
└── index.html                    # HTML shell
```

## Useful Commands

| Command | Description |
|---------|-------------|
| `bun run tauri dev` | Start dev mode (Vite + Rust with hot reload) |
| `bun run tauri build` | Build production installer |
| `bun run dev` | Start Vite dev server only (no Rust) |
| `bun run build` | TypeScript check + Vite production build |

## Adding a New Tauri Command

### 1. Define types in `models.rs`

If the command needs new data structures, add them:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MyNewStruct {
    pub some_field: String,
}
```

### 2. Implement the command in `commands.rs`

```rust
#[tauri::command]
pub fn my_new_command(
    app_config: State<'_, Arc<AppConfig>>,
    some_param: String,
) -> Result<MyNewStruct, String> {
    let config = app_config.config.lock().map_err(|e| e.to_string())?;
    // ... logic ...
    Ok(MyNewStruct { some_field: some_param })
}
```

### 3. Register in `lib.rs`

Add the command to the `invoke_handler` macro:

```rust
.invoke_handler(tauri::generate_handler![
    // ... existing commands ...
    commands::my_new_command,
])
```

### 4. Add the TypeScript type in `types.ts`

```typescript
export interface MyNewStruct {
  someField: string;
}
```

### 5. Add the invoke wrapper in `tauri.ts`

```typescript
export async function myNewCommand(someParam: string): Promise<MyNewStruct> {
  return invoke<MyNewStruct>("my_new_command", { someParam });
}
```

## Adding a Translation Key

1. Add the key to `src/i18n/fr.json`:
   ```json
   "myFeature.label": "Mon libellé"
   ```

2. Add the same key to `src/i18n/en.json`:
   ```json
   "myFeature.label": "My label"
   ```

3. Use it in a component:
   ```tsx
   const { t } = useI18n();
   return <Text>{t("myFeature.label")}</Text>;
   ```

For parameterized strings, use `{paramName}` placeholders:
```json
"myFeature.count": "{count} items"
```
```tsx
t("myFeature.count", { count: 42 })
```

## Code Conventions

- **Rust**: `snake_case` for functions/variables, `PascalCase` for types. All public items get `///` doc comments. Serde `rename_all = "camelCase"` on all serialized structs.
- **TypeScript**: `camelCase` for functions/variables, `PascalCase` for types/components. Strict mode enabled, no unused locals or parameters.
- **Components**: One component per file, file name matches component name. Props defined as an interface in the same file.
- **State**: React hooks for local state, no external state library. Business logic in custom hooks, not in components.
- **Styling**: Fluent UI `makeStyles` + `tokens` for component styles. Global CSS only for base resets and scrollbar overrides.
- **i18n**: All user-facing strings go through `t()`. Keys are dot-namespaced (e.g. `task.name`, `settings.title`).
