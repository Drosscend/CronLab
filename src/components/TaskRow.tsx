import {
  Badge,
  Button,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Spinner,
  Switch,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  MoreHorizontal20Regular,
  Play20Regular,
  Edit20Regular,
  Delete20Regular,
  History20Regular,
} from "@fluentui/react-icons";
import type { Task } from "../lib/types";
import { useI18n } from "../i18n";
import { useCountdown } from "../hooks/useCountdown";
import { useState, useEffect, useRef, useCallback } from "react";
import { getExecutions } from "../lib/tauri";

const useStyles = makeStyles({
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 110px 80px 60px 72px",
    alignItems: "center",
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalL}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    fontSize: tokens.fontSizeBase300,
    "&:hover": {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  disabled: {
    opacity: 0.45,
  },
  name: {
    fontWeight: tokens.fontWeightSemibold,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  countdown: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: "2px",
  },
});

interface TaskRowProps {
  task: Task;
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onViewLogs: (task: Task) => void;
  onRunNow: (id: string) => void;
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  switch (status) {
    case "success":
      return <Badge appearance="tint" color="success" size="small">{t("status.success")}</Badge>;
    case "failed":
      return <Badge appearance="tint" color="danger" size="small">{t("status.failed")}</Badge>;
    case "timeout":
      return <Badge appearance="tint" color="warning" size="small">{t("status.timeout")}</Badge>;
    case "running":
      return <Badge appearance="tint" color="informative" size="small">{t("status.running")}</Badge>;
    default:
      return <Badge appearance="outline" color="subtle" size="small">{t("status.never")}</Badge>;
  }
}

export function TaskRow({
  task,
  onToggle,
  onEdit,
  onDelete,
  onViewLogs,
  onRunNow,
}: TaskRowProps) {
  const styles = useStyles();
  const { t } = useI18n();
  const { label: countdown } = useCountdown(task.id, task.enabled, t);
  const [lastStatus, setLastStatus] = useState<string>("never");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const execs = await getExecutions(task.id, 1);
      if (execs.length > 0) {
        setLastStatus(execs[0].status);
        return execs[0].status;
      }
    } catch { /* ignore */ }
    return "never";
  }, [task.id]);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll while running
  useEffect(() => {
    if (lastStatus === "running") {
      pollRef.current = setInterval(async () => {
        const status = await fetchStatus();
        if (status !== "running" && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }, 2000);
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [lastStatus, fetchStatus]);

  const handleRunNow = async () => {
    setLastStatus("running");
    try {
      await onRunNow(task.id);
      // The poll loop will pick up the final status
    } catch {
      await fetchStatus();
    }
  };

  const isRunning = lastStatus === "running";

  return (
    <div className={`${styles.row} ${!task.enabled ? styles.disabled : ""}`}>
      <span className={styles.name}>{task.name}</span>
      <span className={styles.countdown}>{countdown}</span>
      <span>
        <StatusBadge status={lastStatus} />
      </span>
      <span>
        <Switch
          checked={task.enabled}
          onChange={(_, data) => onToggle(task.id, data.checked)}
        />
      </span>
      <span className={styles.actions}>
        {isRunning ? (
          <Spinner size="tiny" />
        ) : (
          <Button
            icon={<Play20Regular />}
            appearance="subtle"
            size="small"
            aria-label={t("task.runNow")}
            onClick={handleRunNow}
          />
        )}
        <Menu>
          <MenuTrigger>
            <Button
              icon={<MoreHorizontal20Regular />}
              appearance="subtle"
              size="small"
            />
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem icon={<Edit20Regular />} onClick={() => onEdit(task)}>
                {t("task.edit")}
              </MenuItem>
              <MenuItem
                icon={<History20Regular />}
                onClick={() => onViewLogs(task)}
              >
                {t("task.logs")}
              </MenuItem>
              <MenuItem
                icon={<Delete20Regular />}
                onClick={() => onDelete(task)}
              >
                {t("task.delete")}
              </MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
      </span>
    </div>
  );
}
