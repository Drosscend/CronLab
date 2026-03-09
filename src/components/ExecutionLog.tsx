import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { ChevronDown16Regular, ChevronUp16Regular } from "@fluentui/react-icons";
import { useState, useEffect } from "react";
import type { Task, Execution } from "../lib/types";
import { getExecutions } from "../lib/tauri";
import { useI18n } from "../i18n";
import { StatusBadge } from "./StatusBadge";

const useStyles = makeStyles({
  list: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
    maxHeight: "400px",
    overflow: "auto",
  },
  entry: {
    display: "flex",
    flexDirection: "column",
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: tokens.spacingVerticalS,
  },
  entryHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalS,
  },
  entryMeta: {
    display: "flex",
    gap: tokens.spacingHorizontalM,
    alignItems: "center",
    flex: 1,
  },
  output: {
    marginTop: tokens.spacingVerticalS,
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXS,
  },
  pre: {
    backgroundColor: tokens.colorNeutralBackground3,
    padding: tokens.spacingVerticalS,
    borderRadius: tokens.borderRadiusMedium,
    fontFamily: "'Cascadia Code', 'Cascadia Mono', Consolas, monospace",
    fontSize: tokens.fontSizeBase200,
    maxHeight: "200px",
    overflow: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
  },
  empty: {
    textAlign: "center" as const,
    padding: tokens.spacingVerticalXXL,
    color: tokens.colorNeutralForeground3,
  },
});

interface ExecutionLogProps {
  open: boolean;
  onClose: () => void;
  task: Task | null;
}

function formatDuration(startedAt: string, finishedAt: string | null): string {
  if (!finishedAt) return "...";
  const start = new Date(startedAt).getTime();
  const end = new Date(finishedAt).getTime();
  const seconds = Math.floor((end - start) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

function ExecutionEntry({ execution }: { execution: Execution }) {
  const styles = useStyles();
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={styles.entry}>
      <div className={styles.entryHeader}>
        <div className={styles.entryMeta}>
          <Text size={200}>{formatDateTime(execution.startedAt)}</Text>
          <Text size={200}>
            {formatDuration(execution.startedAt, execution.finishedAt)}
          </Text>
          <StatusBadge status={execution.status} appearance="filled" />
        </div>
        <Button
          icon={expanded ? <ChevronUp16Regular /> : <ChevronDown16Regular />}
          appearance="subtle"
          size="small"
          onClick={() => setExpanded(!expanded)}
        >
          {t("log.output")}
        </Button>
      </div>

      {expanded && (
        <div className={styles.output}>
          {execution.stdout && (
            <>
              <Text size={200} weight="semibold">
                {t("log.stdout")}
              </Text>
              <pre className={styles.pre}>{execution.stdout}</pre>
            </>
          )}
          {execution.stderr && (
            <>
              <Text size={200} weight="semibold">
                {t("log.stderr")}
              </Text>
              <pre className={styles.pre}>{execution.stderr}</pre>
            </>
          )}
          {!execution.stdout && !execution.stderr && (
            <Text size={200} italic>
              {t("log.emptyOutput")}
            </Text>
          )}
        </div>
      )}
    </div>
  );
}

export function ExecutionLog({ open: isOpen, onClose, task }: ExecutionLogProps) {
  const styles = useStyles();
  const { t } = useI18n();
  const [executions, setExecutions] = useState<Execution[]>([]);

  useEffect(() => {
    if (isOpen && task) {
      getExecutions(task.id)
        .then(setExecutions)
        .catch(() => setExecutions([]));
    }
  }, [isOpen, task]);

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
            {t("log.title", { name: task?.name || "" })}
          </DialogTitle>
          <DialogContent>
            {executions.length === 0 ? (
              <div className={styles.empty}>
                <Text>{t("log.empty")}</Text>
              </div>
            ) : (
              <div className={styles.list}>
                {executions.map((exec) => (
                  <ExecutionEntry key={exec.id} execution={exec} />
                ))}
              </div>
            )}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose}>
              {t("log.close")}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
