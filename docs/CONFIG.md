# Configuration Reference

CronLab stores all its data under the user's home directory.

## File Locations

| File | Path | Purpose |
|------|------|---------|
| Configuration | `C:\Users\<user>\.cronlab\config.json` | Tasks, settings |
| Execution logs | `C:\Users\<user>\.cronlab\logs\{taskId}.json` | Per-task history |

Both files are human-readable JSON. The directories are created automatically on first launch.

## config.json

### Full Example

```json
{
  "version": 1,
  "settings": {
    "language": "fr",
    "launchAtStartup": true,
    "closeToTray": true,
    "defaultTimeoutSeconds": 1800,
    "maxLogRetention": 10,
    "notifications": true
  },
  "tasks": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Daily DB backup",
      "command": "pg_dump -U postgres mydb > backup.sql",
      "workingDirectory": "C:\\Backups\\db",
      "schedule": {
        "type": "daily",
        "time": "03:00"
      },
      "enabled": true,
      "envVars": {
        "PGPASSWORD": "s3cret"
      },
      "timeoutSeconds": 3600,
      "createdAt": "2026-01-15T10:30:00+01:00",
      "updatedAt": "2026-02-20T14:00:00+01:00"
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "name": "Weekly log cleanup",
      "command": "powershell -Command Remove-Item C:\\Logs\\*.log -Force",
      "workingDirectory": "C:\\Logs",
      "schedule": {
        "type": "weekly",
        "time": "02:00",
        "daysOfWeek": [1, 5]
      },
      "enabled": true,
      "envVars": {},
      "timeoutSeconds": null,
      "createdAt": "2026-01-20T09:00:00+01:00",
      "updatedAt": "2026-01-20T09:00:00+01:00"
    },
    {
      "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "name": "Health check every 15 min",
      "command": "curl -sf http://localhost:8080/health",
      "workingDirectory": "C:\\Users\\user",
      "schedule": {
        "type": "hourly",
        "intervalMinutes": 15
      },
      "enabled": false,
      "envVars": {},
      "timeoutSeconds": 30,
      "createdAt": "2026-03-01T16:45:00+01:00",
      "updatedAt": "2026-03-05T11:20:00+01:00"
    }
  ]
}
```

### Settings Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `language` | `"fr"` \| `"en"` | `"fr"` | UI language |
| `launchAtStartup` | boolean | `true` | Register the app to auto-start with the OS |
| `closeToTray` | boolean | `true` | Closing the window hides it to the system tray instead of quitting |
| `defaultTimeoutSeconds` | number | `1800` | Fallback timeout (30 min) for tasks that don't set their own |
| `maxLogRetention` | number | `10` | Max finished execution records kept per task |
| `notifications` | boolean | `true` | Send native OS notifications on task completion |

### Task Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | UUID v4, auto-generated |
| `name` | string | Human-readable label |
| `command` | string | Shell command, split by whitespace at runtime |
| `workingDirectory` | string | Absolute path used as the process CWD |
| `schedule` | object | See [Schedule](#schedule) below |
| `enabled` | boolean | Whether the scheduler evaluates this task |
| `envVars` | object | Key-value pairs injected as environment variables |
| `timeoutSeconds` | number \| null | Per-task timeout override. `null` uses `defaultTimeoutSeconds` |
| `createdAt` | string | RFC 3339 timestamp, set once at creation |
| `updatedAt` | string | RFC 3339 timestamp, updated on every modification |

### Schedule

The `type` field determines which optional fields are used:

| type | Required fields | Description |
|------|-----------------|-------------|
| `daily` | `time` | Runs once a day at the specified time |
| `hourly` | `intervalMinutes` | Runs every N minutes (default 60), aligned to midnight |
| `weekly` | `time`, `daysOfWeek` | Runs on specific days (1=Mon, 7=Sun) at the specified time |
| `custom_cron` | `cronExpression` | Standard 6/7-field cron expression parsed by the `cron` crate |

**`time` format**: `"HH:MM"` in 24-hour local time (e.g. `"14:30"`).

**`daysOfWeek`**: Array of integers where 1 = Monday through 7 = Sunday.

**`intervalMinutes`**: Integer from 1 to 1440. Slots are aligned to midnight (e.g. interval 15 → 00:00, 00:15, 00:30, ...).

**`cronExpression`**: Standard cron syntax. Example: `"0 0 */2 * * *"` (every 2 hours).

## Execution Logs

Each task has its own log file at `~/.cronlab/logs/{taskId}.json`.

### Example

```json
[
  {
    "id": "d4e5f6a7-b8c9-0123-def0-234567890123",
    "taskId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "startedAt": "2026-03-09T03:00:01+01:00",
    "finishedAt": "2026-03-09T03:00:14+01:00",
    "exitCode": 0,
    "stdout": "DUMP completed\n",
    "stderr": "",
    "status": "success"
  },
  {
    "id": "e5f6a7b8-c9d0-1234-ef01-345678901234",
    "taskId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "startedAt": "2026-03-08T03:00:01+01:00",
    "finishedAt": "2026-03-08T03:05:22+01:00",
    "exitCode": 1,
    "stdout": "",
    "stderr": "pg_dump: connection refused",
    "status": "failed"
  }
]
```

### Execution Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | UUID v4 for this execution |
| `taskId` | string | Reference to the parent task |
| `startedAt` | string | RFC 3339 timestamp of process spawn |
| `finishedAt` | string \| null | RFC 3339 timestamp of process exit, `null` while running |
| `exitCode` | number \| null | OS exit code, `null` while running or on timeout |
| `stdout` | string | Captured standard output (max 10 KB) |
| `stderr` | string | Captured standard error (max 10 KB) |
| `status` | string | `"running"`, `"success"`, `"failed"`, or `"timeout"` |

### Log Retention

The app keeps at most `maxLogRetention` finished executions per task. When the limit is exceeded, the oldest finished entries are removed first. Running executions are never pruned.

## Import / Export

To migrate tasks between machines, copy `~/.cronlab/config.json` to the target machine's `~/.cronlab/` directory. The app will pick up the new configuration on next launch. Execution logs can optionally be copied from `~/.cronlab/logs/` as well.
