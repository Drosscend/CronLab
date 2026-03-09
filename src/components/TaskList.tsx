import {
  Input,
  Select,
  Table,
  TableBody,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { Search24Regular } from "@fluentui/react-icons";
import { useState, useMemo } from "react";
import type { Task } from "../lib/types";
import { useI18n } from "../i18n";
import { TaskRow } from "./TaskRow";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    overflow: "hidden",
  },
  filterBar: {
    display: "flex",
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
  },
  tableContainer: {
    flex: 1,
    overflow: "auto",
    padding: `0 ${tokens.spacingHorizontalM}`,
  },
  empty: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    padding: tokens.spacingVerticalXXL,
    color: tokens.colorNeutralForeground3,
  },
});

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onViewLogs: (task: Task) => void;
  onRunNow: (id: string) => void;
}

type SortMode = "nextRun" | "name" | "created";

export function TaskList({
  tasks,
  onToggle,
  onEdit,
  onDelete,
  onViewLogs,
  onRunNow,
}: TaskListProps) {
  const styles = useStyles();
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("nextRun");

  const filteredTasks = useMemo(() => {
    let result = tasks;

    if (search) {
      const lower = search.toLowerCase();
      result = result.filter((task) =>
        task.name.toLowerCase().includes(lower)
      );
    }

    result = [...result].sort((a, b) => {
      switch (sortMode) {
        case "name":
          return a.name.localeCompare(b.name);
        case "created":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "nextRun":
        default:
          // Enabled tasks first, then by name
          if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
          return a.name.localeCompare(b.name);
      }
    });

    return result;
  }, [tasks, search, sortMode]);

  return (
    <div className={styles.container}>
      <div className={styles.filterBar}>
        <Input
          className={styles.searchInput}
          contentBefore={<Search24Regular />}
          placeholder={t("filter.search")}
          value={search}
          onChange={(_, data) => setSearch(data.value)}
        />
        <Select
          value={sortMode}
          onChange={(_, data) => setSortMode(data.value as SortMode)}
        >
          <option value="nextRun">{t("sort.nextRun")}</option>
          <option value="name">{t("sort.name")}</option>
          <option value="created">{t("sort.created")}</option>
        </Select>
      </div>

      {filteredTasks.length === 0 ? (
        <div className={styles.empty}>
          <Text>{t("task.empty")}</Text>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <Table size="small">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>{t("task.name")}</TableHeaderCell>
                <TableHeaderCell>{t("task.nextRun")}</TableHeaderCell>
                <TableHeaderCell>{t("task.status")}</TableHeaderCell>
                <TableHeaderCell>{t("task.active")}</TableHeaderCell>
                <TableHeaderCell>{t("task.actions")}</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={onToggle}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onViewLogs={onViewLogs}
                  onRunNow={onRunNow}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
