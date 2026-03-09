import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Link,
  Select,
  SpinButton,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { FolderOpen24Regular } from "@fluentui/react-icons";
import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import type { Task, TaskInput, Schedule } from "../lib/types";
import { useI18n } from "../i18n";
import { TaskAdvanced } from "./TaskAdvanced";
import { TimePicker } from "./TimePicker";

const useStyles = makeStyles({
  form: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalM,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXS,
  },
  dirField: {
    display: "flex",
    gap: tokens.spacingHorizontalXS,
  },
  dirInput: {
    flex: 1,
  },
  daysRow: {
    display: "flex",
    gap: tokens.spacingHorizontalXS,
    flexWrap: "wrap",
  },
});

interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (input: TaskInput) => void;
  editTask?: Task | null;
  defaultTimeout: number;
}

const DAY_KEYS = [
  "days.mon",
  "days.tue",
  "days.wed",
  "days.thu",
  "days.fri",
  "days.sat",
  "days.sun",
] as const;

export function TaskForm({
  open: isOpen,
  onClose,
  onSave,
  editTask,
  defaultTimeout,
}: TaskFormProps) {
  const styles = useStyles();
  const { t } = useI18n();

  const [name, setName] = useState("");
  const [command, setCommand] = useState("");
  const [workingDirectory, setWorkingDirectory] = useState("");
  const [scheduleType, setScheduleType] = useState<Schedule["type"]>("daily");
  const [time, setTime] = useState("09:00");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [cronExpression, setCronExpression] = useState("");
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [timeoutSeconds, setTimeoutSeconds] = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (editTask) {
      setName(editTask.name);
      setCommand(editTask.command);
      setWorkingDirectory(editTask.workingDirectory);
      setScheduleType(editTask.schedule.type);
      setTime(editTask.schedule.time || "09:00");
      setDaysOfWeek(editTask.schedule.daysOfWeek || [1, 2, 3, 4, 5]);
      setIntervalMinutes(editTask.schedule.intervalMinutes || 60);
      setCronExpression(editTask.schedule.cronExpression || "");
      setEnvVars(editTask.envVars);
      setTimeoutSeconds(editTask.timeoutSeconds);
      setShowAdvanced(
        Object.keys(editTask.envVars).length > 0 ||
          editTask.timeoutSeconds !== null
      );
    } else {
      setName("");
      setCommand("");
      setWorkingDirectory("");
      setScheduleType("daily");
      setTime("09:00");
      setDaysOfWeek([1, 2, 3, 4, 5]);
      setIntervalMinutes(60);
      setCronExpression("");
      setEnvVars({});
      setTimeoutSeconds(null);
      setShowAdvanced(false);
    }
  }, [editTask, isOpen]);

  const handlePickDir = async () => {
    const dir = await open({ directory: true });
    if (dir) {
      setWorkingDirectory(dir as string);
    }
  };

  const handleSave = () => {
    const schedule: Schedule = { type: scheduleType };

    switch (scheduleType) {
      case "daily":
        schedule.time = time;
        break;
      case "weekly":
        schedule.time = time;
        schedule.daysOfWeek = daysOfWeek;
        break;
      case "hourly":
        schedule.intervalMinutes = intervalMinutes;
        break;
      case "custom_cron":
        schedule.cronExpression = cronExpression;
        break;
    }

    onSave({
      name,
      command,
      workingDirectory,
      schedule,
      envVars,
      timeoutSeconds,
    });
    onClose();
  };

  const toggleDay = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(_, data) => {
        if (!data.open) onClose();
      }}
    >
      <DialogSurface>
        <DialogBody>
          <DialogTitle>
            {editTask ? t("task.edit") : t("task.new")}
          </DialogTitle>
          <DialogContent>
            <div className={styles.form}>
              <div className={styles.field}>
                <Label required>{t("task.name")}</Label>
                <Input
                  value={name}
                  onChange={(_, data) => setName(data.value)}
                />
              </div>

              <div className={styles.field}>
                <Label required>{t("task.command")}</Label>
                <Input
                  value={command}
                  onChange={(_, data) => setCommand(data.value)}
                  placeholder="bun dist/index.js"
                />
              </div>

              <div className={styles.field}>
                <Label required>{t("task.directory")}</Label>
                <div className={styles.dirField}>
                  <Input
                    className={styles.dirInput}
                    value={workingDirectory}
                    onChange={(_, data) => setWorkingDirectory(data.value)}
                  />
                  <Button
                    icon={<FolderOpen24Regular />}
                    appearance="subtle"
                    onClick={handlePickDir}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <Label>{t("task.schedule")}</Label>
                <Select
                  value={scheduleType}
                  onChange={(_, data) =>
                    setScheduleType(data.value as Schedule["type"])
                  }
                >
                  <option value="daily">{t("schedule.daily")}</option>
                  <option value="hourly">{t("schedule.hourly")}</option>
                  <option value="weekly">{t("schedule.weekly")}</option>
                  <option value="custom_cron">{t("schedule.cron")}</option>
                </Select>
              </div>

              {(scheduleType === "daily" || scheduleType === "weekly") && (
                <div className={styles.field}>
                  <Label>{t("schedule.time")}</Label>
                  <TimePicker value={time} onChange={setTime} />
                </div>
              )}

              {scheduleType === "weekly" && (
                <div className={styles.field}>
                  <Label>{t("schedule.days")}</Label>
                  <div className={styles.daysRow}>
                    {DAY_KEYS.map((key, i) => (
                      <Checkbox
                        key={i}
                        label={t(key)}
                        checked={daysOfWeek.includes(i + 1)}
                        onChange={() => toggleDay(i + 1)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {scheduleType === "hourly" && (
                <div className={styles.field}>
                  <Label>{t("schedule.interval")}</Label>
                  <SpinButton
                    value={intervalMinutes}
                    min={1}
                    max={1440}
                    onChange={(_, data) => {
                      if (data.value !== undefined && data.value !== null) {
                        setIntervalMinutes(data.value);
                      }
                    }}
                  />
                </div>
              )}

              {scheduleType === "custom_cron" && (
                <div className={styles.field}>
                  <Label>{t("schedule.cronExpr")}</Label>
                  <Input
                    value={cronExpression}
                    onChange={(_, data) => setCronExpression(data.value)}
                    placeholder="0 */2 * * *"
                  />
                </div>
              )}

              <Link onClick={() => setShowAdvanced(!showAdvanced)}>
                {t("task.advanced")} {showAdvanced ? "\u25B4" : "\u25BE"}
              </Link>

              {showAdvanced && (
                <TaskAdvanced
                  envVars={envVars}
                  onEnvVarsChange={setEnvVars}
                  timeoutSeconds={timeoutSeconds}
                  onTimeoutChange={setTimeoutSeconds}
                  defaultTimeout={defaultTimeout}
                />
              )}
            </div>
          </DialogContent>
          <DialogActions>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary">{t("task.cancel")}</Button>
            </DialogTrigger>
            <Button
              appearance="primary"
              onClick={handleSave}
              disabled={!name || !command || !workingDirectory}
            >
              {t("task.save")}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
