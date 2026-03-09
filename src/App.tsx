import {
  FluentProvider,
  webDarkTheme,
  webLightTheme,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Text,
  makeStyles,
} from "@fluentui/react-components";
import { useState, useCallback, useMemo, useEffect } from "react";
import { useTheme } from "./hooks/useTheme";
import { useTasks } from "./hooks/useTasks";
import { useSettings } from "./hooks/useSettings";
import { I18nContext, translate } from "./i18n";
import type { Language } from "./i18n";
import type { Task, TaskInput } from "./lib/types";
import { Header } from "./components/Header";
import { TaskList } from "./components/TaskList";
import { TaskForm } from "./components/TaskForm";
import { ExecutionLog } from "./components/ExecutionLog";
import { SettingsPanel } from "./components/SettingsPanel";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    overflow: "hidden",
  },
});

type View = "tasks" | "settings";

function App() {
  const styles = useStyles();
  const theme = useTheme();
  const { tasks, create, update, remove, toggle, runNow } = useTasks();
  const { settings, save: saveSettings } = useSettings();

  const [language, setLanguage] = useState<Language>("fr");
  const [view, setView] = useState<View>("tasks");
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logsTask, setLogsTask] = useState<Task | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);

  useEffect(() => {
    if (settings) setLanguage(settings.language);
  }, [settings]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translate(language, key, params),
    [language]
  );

  const i18nValue = useMemo(
    () => ({ language, setLanguage, t }),
    [language, t]
  );

  const handleNewTask = () => {
    setEditTask(null);
    setShowForm(true);
  };

  const handleEdit = (task: Task) => {
    setEditTask(task);
    setShowForm(true);
  };

  const handleSaveTask = async (input: TaskInput) => {
    if (editTask) {
      await update(editTask.id, input);
    } else {
      await create(input);
    }
  };

  const handleDelete = (task: Task) => {
    setDeleteTask(task);
  };

  const confirmDelete = async () => {
    if (deleteTask) {
      await remove(deleteTask.id);
      setDeleteTask(null);
    }
  };

  const handleViewLogs = (task: Task) => {
    setLogsTask(task);
    setShowLogs(true);
  };

  const handleSaveSettings = async (newSettings: typeof settings) => {
    if (newSettings) {
      await saveSettings(newSettings);
      setLanguage(newSettings.language);
    }
  };

  return (
    <FluentProvider
      theme={theme === "dark" ? webDarkTheme : webLightTheme}
    >
      <I18nContext.Provider value={i18nValue}>
        {view === "settings" ? (
          <SettingsPanel
            open={true}
            onClose={() => setView("tasks")}
            settings={settings}
            onSave={handleSaveSettings}
          />
        ) : (
          <div className={styles.root}>
            <Header
              onNewTask={handleNewTask}
              onOpenSettings={() => setView("settings")}
            />
            <TaskList
              tasks={tasks}
              onToggle={toggle}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onViewLogs={handleViewLogs}
              onRunNow={runNow}
            />
          </div>
        )}

        <TaskForm
          open={showForm}
          onClose={() => setShowForm(false)}
          onSave={handleSaveTask}
          editTask={editTask}
          defaultTimeout={settings?.defaultTimeoutSeconds ?? 1800}
        />

        <ExecutionLog
          open={showLogs}
          onClose={() => setShowLogs(false)}
          task={logsTask}
        />

        {/* Delete confirmation dialog */}
        <Dialog
          open={deleteTask !== null}
          onOpenChange={(_, data) => {
            if (!data.open) setDeleteTask(null);
          }}
        >
          <DialogSurface>
            <DialogBody>
              <DialogTitle>{t("confirm.delete")}</DialogTitle>
              <DialogContent>
                <Text>{t("confirm.deleteBody")}</Text>
              </DialogContent>
              <DialogActions>
                <Button
                  appearance="secondary"
                  onClick={() => setDeleteTask(null)}
                >
                  {t("confirm.no")}
                </Button>
                <Button appearance="primary" onClick={confirmDelete}>
                  {t("confirm.yes")}
                </Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>
      </I18nContext.Provider>
    </FluentProvider>
  );
}

export default App;
