import { invoke } from "@tauri-apps/api/core";
import type { Task, TaskInput, Execution, Settings } from "./types";

export async function getTasks(): Promise<Task[]> {
  return invoke<Task[]>("get_tasks");
}

export async function createTask(input: TaskInput): Promise<Task> {
  return invoke<Task>("create_task", { input });
}

export async function updateTask(id: string, input: TaskInput): Promise<Task> {
  return invoke<Task>("update_task", { id, input });
}

export async function deleteTask(id: string): Promise<void> {
  return invoke("delete_task", { id });
}

export async function toggleTask(id: string, enabled: boolean): Promise<void> {
  return invoke("toggle_task", { id, enabled });
}

export async function runTaskNow(id: string): Promise<void> {
  return invoke("run_task_now", { id });
}

export async function getExecutions(
  taskId: string,
  limit?: number
): Promise<Execution[]> {
  return invoke<Execution[]>("get_executions", { taskId, limit });
}

export async function getNextRun(id: string): Promise<string | null> {
  return invoke<string | null>("get_next_run", { id });
}

export async function getSettings(): Promise<Settings> {
  return invoke<Settings>("get_settings");
}

export async function updateSettings(settings: Settings): Promise<void> {
  return invoke("update_settings", { settings });
}
