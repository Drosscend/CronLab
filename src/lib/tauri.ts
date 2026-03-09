/**
 * Tauri IPC bridge — typed wrappers around `invoke()` for all backend commands.
 *
 * Each function maps 1:1 to a `#[tauri::command]` handler in `commands.rs`.
 */

import { invoke } from "@tauri-apps/api/core";
import type { Task, TaskInput, Execution, Settings } from "./types";

/** Fetch all registered tasks. */
export async function getTasks(): Promise<Task[]> {
  return invoke<Task[]>("get_tasks");
}

/** Create a new task. The backend assigns `id`, `enabled`, and timestamps. */
export async function createTask(input: TaskInput): Promise<Task> {
  return invoke<Task>("create_task", { input });
}

/** Update an existing task identified by `id`. */
export async function updateTask(id: string, input: TaskInput): Promise<Task> {
  return invoke<Task>("update_task", { id, input });
}

/** Delete a task and its execution logs. */
export async function deleteTask(id: string): Promise<void> {
  return invoke("delete_task", { id });
}

/** Enable or disable a task without modifying its other fields. */
export async function toggleTask(id: string, enabled: boolean): Promise<void> {
  return invoke("toggle_task", { id, enabled });
}

/** Execute a task immediately, bypassing the schedule. */
export async function runTaskNow(id: string): Promise<void> {
  return invoke("run_task_now", { id });
}

/** Fetch execution history for a task, most recent first. */
export async function getExecutions(
  taskId: string,
  limit?: number
): Promise<Execution[]> {
  return invoke<Execution[]>("get_executions", { taskId, limit });
}

/** Compute the next scheduled run time for a task (RFC 3339 string or null). */
export async function getNextRun(id: string): Promise<string | null> {
  return invoke<string | null>("get_next_run", { id });
}

/** Fetch current application settings. */
export async function getSettings(): Promise<Settings> {
  return invoke<Settings>("get_settings");
}

/** Persist updated application settings. */
export async function updateSettings(settings: Settings): Promise<void> {
  return invoke("update_settings", { settings });
}
