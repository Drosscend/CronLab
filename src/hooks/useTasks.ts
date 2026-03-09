import { useState, useEffect, useCallback } from "react";
import type { Task, TaskInput } from "../lib/types";
import * as api from "../lib/tauri";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const t = await api.getTasks();
      setTasks(t);
    } catch (err) {
      console.error("Failed to load tasks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(
    async (input: TaskInput) => {
      const task = await api.createTask(input);
      setTasks((prev) => [...prev, task]);
      return task;
    },
    []
  );

  const update = useCallback(
    async (id: string, input: TaskInput) => {
      const task = await api.updateTask(id, input);
      setTasks((prev) => prev.map((t) => (t.id === id ? task : t)));
      return task;
    },
    []
  );

  const remove = useCallback(
    async (id: string) => {
      await api.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    },
    []
  );

  const toggle = useCallback(
    async (id: string, enabled: boolean) => {
      await api.toggleTask(id, enabled);
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, enabled } : t))
      );
    },
    []
  );

  const runNow = useCallback(async (id: string) => {
    await api.runTaskNow(id);
  }, []);

  return { tasks, loading, create, update, remove, toggle, runNow, reload: load };
}
