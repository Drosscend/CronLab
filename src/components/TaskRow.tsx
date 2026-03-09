import {
  Badge,
  Button,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Switch,
  TableCell,
  TableRow,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  MoreHorizontal24Regular,
  Play24Regular,
  Edit24Regular,
  Delete24Regular,
  History24Regular,
} from "@fluentui/react-icons";
import type { Task } from "../lib/types";
import { useI18n } from "../i18n";
import { useCountdown } from "../hooks/useCountdown";
import { useState, useEffect } from "react";
import { getExecutions } from "../lib/tauri";

const useStyles = makeStyles({
  disabled: {
    opacity: 0.5,
  },
  nameCell: {
    fontWeight: tokens.fontWeightSemibold,
  },
  actionsCell: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
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
      return <Badge appearance="filled" color="success">{t("status.success")}</Badge>;
    case "failed":
      return <Badge appearance="filled" color="danger">{t("status.failed")}</Badge>;
    case "timeout":
      return <Badge appearance="filled" color="warning">{t("status.timeout")}</Badge>;
    case "running":
      return <Badge appearance="filled" color="informative">{t("status.running")}</Badge>;
    default:
      return <Badge appearance="outline" color="subtle">{t("status.never")}</Badge>;
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
  const [running, setRunning] = useState(false);

  useEffect(() => {
    getExecutions(task.id, 1).then((execs) => {
      if (execs.length > 0) {
        setLastStatus(execs[0].status);
      }
    });
  }, [task.id]);

  const handleRunNow = async () => {
    setRunning(true);
    try {
      await onRunNow(task.id);
      // Poll for result after a short delay
      setTimeout(async () => {
        const execs = await getExecutions(task.id, 1);
        if (execs.length > 0) {
          setLastStatus(execs[0].status);
        }
        setRunning(false);
      }, 2000);
    } catch {
      setRunning(false);
    }
  };

  return (
    <TableRow className={!task.enabled ? styles.disabled : undefined}>
      <TableCell className={styles.nameCell}>{task.name}</TableCell>
      <TableCell>{countdown}</TableCell>
      <TableCell>
        <StatusBadge status={lastStatus} />
      </TableCell>
      <TableCell>
        <Switch
          checked={task.enabled}
          onChange={(_, data) => onToggle(task.id, data.checked)}
        />
      </TableCell>
      <TableCell>
        <div className={styles.actionsCell}>
          <Button
            icon={<Play24Regular />}
            appearance="subtle"
            size="small"
            aria-label={t("task.runNow")}
            onClick={handleRunNow}
            disabled={running}
          />
          <Menu>
            <MenuTrigger>
              <Button
                icon={<MoreHorizontal24Regular />}
                appearance="subtle"
                size="small"
              />
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem icon={<Edit24Regular />} onClick={() => onEdit(task)}>
                  {t("task.edit")}
                </MenuItem>
                <MenuItem
                  icon={<History24Regular />}
                  onClick={() => onViewLogs(task)}
                >
                  {t("task.logs")}
                </MenuItem>
                <MenuItem
                  icon={<Delete24Regular />}
                  onClick={() => onDelete(task)}
                >
                  {t("task.delete")}
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        </div>
      </TableCell>
    </TableRow>
  );
}
