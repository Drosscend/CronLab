import { useState, useEffect, useCallback } from "react";
import type { Settings } from "../lib/types";
import * as api from "../lib/tauri";

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const s = await api.getSettings();
      setSettings(s);
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async (newSettings: Settings) => {
    await api.updateSettings(newSettings);
    setSettings(newSettings);
  }, []);

  return { settings, loading, save, reload: load };
}
