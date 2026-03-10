import { useState, useCallback } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "installing"
  | "up-to-date"
  | "error";

interface UpdaterState {
  status: UpdateStatus;
  version: string | null;
  progress: number;
  error: string | null;
}

export function useUpdater() {
  const [state, setState] = useState<UpdaterState>({
    status: "idle",
    version: null,
    progress: 0,
    error: null,
  });

  const checkForUpdates = useCallback(async () => {
    setState({ status: "checking", version: null, progress: 0, error: null });

    let update: Update | null = null;
    try {
      update = await check();
    } catch (e) {
      setState({
        status: "error",
        version: null,
        progress: 0,
        error: String(e),
      });
      return;
    }

    if (!update) {
      setState({
        status: "up-to-date",
        version: null,
        progress: 0,
        error: null,
      });
      return;
    }

    setState({
      status: "available",
      version: update.version,
      progress: 0,
      error: null,
    });

    try {
      setState((s) => ({ ...s, status: "downloading" }));

      let totalBytes = 0;
      await update.downloadAndInstall((event) => {
        if (event.event === "Started" && event.data.contentLength) {
          totalBytes = event.data.contentLength;
        } else if (event.event === "Progress") {
          const chunk = event.data.chunkLength;
          setState((s) => {
            const downloaded = Math.round(
              (s.progress / 100) * totalBytes + chunk
            );
            const pct =
              totalBytes > 0
                ? Math.min(100, Math.round((downloaded / totalBytes) * 100))
                : 0;
            return { ...s, progress: pct };
          });
        } else if (event.event === "Finished") {
          setState((s) => ({ ...s, status: "installing", progress: 100 }));
        }
      });

      setState((s) => ({ ...s, status: "installing", progress: 100 }));
    } catch (e) {
      setState({
        status: "error",
        version: null,
        progress: 0,
        error: String(e),
      });
    }
  }, []);

  const restartApp = useCallback(async () => {
    await relaunch();
  }, []);

  return { ...state, checkForUpdates, restartApp };
}
