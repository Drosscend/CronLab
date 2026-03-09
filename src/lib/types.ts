/** A scheduled CLI task managed by CronLab. */
export interface Task {
  /** Unique identifier (UUID v4). */
  id: string;
  /** Human-readable task name displayed in the UI. */
  name: string;
  /** Shell command to execute (split by whitespace at runtime). */
  command: string;
  /** Absolute path used as the process working directory. */
  workingDirectory: string;
  /** Schedule configuration determining when the task runs. */
  schedule: Schedule;
  /** Whether the scheduler should evaluate this task. */
  enabled: boolean;
  /** Additional environment variables injected into the spawned process. */
  envVars: Record<string, string>;
  /** Per-task timeout in seconds. Falls back to the global default if null. */
  timeoutSeconds: number | null;
  /** ISO 8601 timestamp of when the task was first created. */
  createdAt: string;
  /** ISO 8601 timestamp of the last modification. */
  updatedAt: string;
}

/**
 * Defines when and how often a task should run.
 *
 * Only the fields relevant to the chosen `type` are used at runtime.
 */
export interface Schedule {
  /** Discriminant: `"daily"`, `"hourly"`, `"weekly"`, or `"custom_cron"`. */
  type: "daily" | "hourly" | "weekly" | "custom_cron";
  /** Time of day in `"HH:MM"` format. Used by daily and weekly schedules. */
  time?: string;
  /** Days of the week (1 = Monday, 7 = Sunday). Used by weekly schedules. */
  daysOfWeek?: number[];
  /** Interval in minutes between runs. Used by hourly schedules (default: 60). */
  intervalMinutes?: number;
  /** Standard cron expression. Used by custom_cron schedules. */
  cronExpression?: string;
}

/**
 * A single execution record for a task.
 *
 * Stored per-task in `~/.cronlab/logs/{taskId}.json`.
 */
export interface Execution {
  /** Unique identifier (UUID v4) for this execution. */
  id: string;
  /** Reference to the parent task ID. */
  taskId: string;
  /** ISO 8601 timestamp of when the process was spawned. */
  startedAt: string;
  /** ISO 8601 timestamp of when the process exited, or null while running. */
  finishedAt: string | null;
  /** Process exit code, or null while running / on timeout. */
  exitCode: number | null;
  /** Captured standard output (truncated to 10 KB). */
  stdout: string;
  /** Captured standard error (truncated to 10 KB). */
  stderr: string;
  /** Current lifecycle status of this execution. */
  status: "running" | "success" | "failed" | "timeout";
}

/** Application-wide settings persisted in config.json. */
export interface Settings {
  /** UI language. */
  language: "fr" | "en";
  /** Register the app to start automatically with the OS. */
  launchAtStartup: boolean;
  /** Hide to system tray instead of quitting on close. */
  closeToTray: boolean;
  /** Fallback timeout in seconds for tasks without a custom timeout. */
  defaultTimeoutSeconds: number;
  /** Maximum number of finished execution records kept per task. */
  maxLogRetention: number;
  /** Enable native desktop notifications on task completion. */
  notifications: boolean;
}

/**
 * Input payload for creating or updating a task.
 *
 * Omits server-generated fields (id, enabled, createdAt, updatedAt).
 */
export interface TaskInput {
  name: string;
  command: string;
  workingDirectory: string;
  schedule: Schedule;
  envVars: Record<string, string>;
  timeoutSeconds: number | null;
}
