import { useState, useEffect } from "react";
import { getNextRun } from "../lib/tauri";

interface CountdownResult {
  label: string;
  nextRun: string | null;
}

export function useCountdown(
  taskId: string,
  enabled: boolean,
  t: (key: string, params?: Record<string, string | number>) => string
): CountdownResult {
  const [nextRun, setNextRun] = useState<string | null>(null);
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!enabled) {
      setLabel(t("countdown.disabled"));
      setNextRun(null);
      return;
    }

    let cancelled = false;

    const fetchNextRun = async () => {
      try {
        const nr = await getNextRun(taskId);
        if (!cancelled) setNextRun(nr);
      } catch {
        if (!cancelled) setNextRun(null);
      }
    };

    fetchNextRun();
    const fetchInterval = setInterval(fetchNextRun, 30000);

    return () => {
      cancelled = true;
      clearInterval(fetchInterval);
    };
  }, [taskId, enabled, t]);

  useEffect(() => {
    if (!enabled) {
      setLabel(t("countdown.disabled"));
      return;
    }

    if (!nextRun) {
      setLabel("-");
      return;
    }

    const updateLabel = () => {
      const now = Date.now();
      const target = new Date(nextRun).getTime();
      const diff = Math.max(0, target - now);

      if (diff <= 0) {
        setLabel(t("countdown.imminent"));
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (hours > 0) {
        setLabel(t("countdown.hours", { h: hours, m: minutes }));
      } else if (minutes > 0) {
        setLabel(t("countdown.minutes", { m: minutes }));
      } else {
        setLabel(t("countdown.seconds", { s: seconds }));
      }
    };

    updateLabel();
    const interval = setInterval(updateLabel, 1000);
    return () => clearInterval(interval);
  }, [nextRun, enabled, t]);

  return { label, nextRun };
}
