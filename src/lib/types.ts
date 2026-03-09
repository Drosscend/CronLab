export interface Task {
  id: string;
  name: string;
  command: string;
  workingDirectory: string;
  schedule: Schedule;
  enabled: boolean;
  envVars: Record<string, string>;
  timeoutSeconds: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Schedule {
  type: "daily" | "hourly" | "weekly" | "custom_cron";
  time?: string;
  daysOfWeek?: number[];
  intervalMinutes?: number;
  cronExpression?: string;
}

export interface Execution {
  id: string;
  taskId: string;
  startedAt: string;
  finishedAt: string | null;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  status: "running" | "success" | "failed" | "timeout";
}

export interface Settings {
  language: "fr" | "en";
  launchAtStartup: boolean;
  closeToTray: boolean;
  defaultTimeoutSeconds: number;
  maxLogRetention: number;
  notifications: boolean;
}

export interface TaskInput {
  name: string;
  command: string;
  workingDirectory: string;
  schedule: Schedule;
  envVars: Record<string, string>;
  timeoutSeconds: number | null;
}
