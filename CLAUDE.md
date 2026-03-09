# CLAUDE.md

## Project

CronLab — Desktop CLI task scheduler for Windows 11 built with Tauri v2 (Rust backend + React/TypeScript frontend) and Fluent UI v9.

## Package manager

**Always use `bun` and `bunx`** — never `npm`, `npx`, `yarn`, or `pnpm`.

```bash
bun install          # install dependencies
bun run tauri dev    # development mode
bun run tauri build  # production build
bunx tsc --noEmit    # type check
```

## Key commands

| Task | Command |
|------|---------|
| Dev mode (frontend + backend) | `bun run tauri dev` |
| Production build | `bun run tauri build` |
| TypeScript check | `bunx tsc --noEmit` |
| Rust check | `cd src-tauri && cargo check` |
| Frontend only | `bun run dev` |

## Architecture

- **Backend** (Rust): `src-tauri/src/` — models, config persistence (`~/.cronlab/`), commands (IPC), scheduler (30s polling loop), executor (thread per task), notifications
- **Frontend** (React 19 + TS): `src/` — components (Fluent UI v9), hooks (useTasks, useSettings, useCountdown, useTheme), i18n (fr/en), typed Tauri invoke wrappers
- **IPC**: Frontend calls `invoke()` → Rust `#[tauri::command]` handlers in `commands.rs`
- **State**: `Arc<Mutex<Config>>` shared across main thread, scheduler thread, and executor threads
- **Config**: `~/.cronlab/config.json` (tasks + settings), `~/.cronlab/logs/{taskId}.json` (execution history)

## Conventions

- **Rust**: `snake_case` functions/variables, `PascalCase` types. `///` doc comments on public items. `serde(rename_all = "camelCase")` on all serialized structs.
- **TypeScript**: strict mode, no unused locals/params. JSDoc on interfaces and exported functions in `lib/`. No JSDoc on React components.
- **i18n**: All user-facing strings go through `t()` from `useI18n()`. Keys are dot-namespaced (`task.name`, `settings.title`). Both `fr.json` and `en.json` must stay in sync.
- **Styling**: Fluent UI `makeStyles` + `tokens`. Global CSS only in `styles/global.css`.
- **Documentation language**: English for all docs and code comments. French for i18n `fr.json` values only.

## Adding a Tauri command

1. Add struct in `models.rs` (if needed)
2. Add `#[tauri::command]` handler in `commands.rs`
3. Register in `lib.rs` invoke_handler
4. Add TS interface in `src/lib/types.ts`
5. Add invoke wrapper in `src/lib/tauri.ts`

## Don't

- Don't use `npm`, `npx`, `yarn`, or `pnpm` — use `bun` / `bunx`
- Don't add comments on trivial code or imports
- Don't add external state management (Redux, Zustand) — hooks are sufficient
- Don't duplicate info already in `docs/` — link to it instead
