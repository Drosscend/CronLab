import {
  Button,
  Dropdown,
  Input,
  Option,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { Search20Regular, Clock24Regular, Add20Regular } from "@fluentui/react-icons";
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
    padding: `0 ${tokens.spacingHorizontalL} ${tokens.spacingVerticalS}`,
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
    overflow: "auto",
  },
  listHeader: {
    display: "grid",
    gridTemplateColumns: "1fr 120px 88px 60px 72px",
    columnGap: tokens.spacingHorizontalM,
    alignItems: "center",
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalL}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    fontWeight: tokens.fontWeightSemibold,
  },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingVerticalXXL,
  },
  emptyIcon: {
    fontSize: "48px",
    color: tokens.colorNeutralForeground3,
  },
  emptyText: {
    color: tokens.colorNeutralForeground2,
  },
});

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onViewLogs: (task: Task) => void;
  onRunNow: (id: string) => void;
  onNewTask: () => void;
}

type SortMode = "nextRun" | "name" | "created";

export function TaskList({
  tasks,
  onToggle,
  onEdit,
  onDelete,
  onViewLogs,
  onRunNow,
  onNewTask,
}: TaskListProps) {
  const styles = useStyles();
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("nextRun");

  const sortLabels: Record<SortMode, string> = {
    nextRun: t("sort.nextRun"),
    name: t("sort.name"),
    created: t("sort.created"),
  };

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
          contentBefore={<Search20Regular />}
          placeholder={t("filter.search")}
          value={search}
          onChange={(_, data) => setSearch(data.value)}
        />
        <Dropdown
          value={sortLabels[sortMode]}
          selectedOptions={[sortMode]}
          onOptionSelect={(_, data) => setSortMode(data.optionValue as SortMode)}
        >
          <Option value="nextRun">{t("sort.nextRun")}</Option>
          <Option value="name">{t("sort.name")}</Option>
          <Option value="created">{t("sort.created")}</Option>
        </Dropdown>
      </div>

      {filteredTasks.length === 0 ? (
        <div className={styles.empty}>
          <Clock24Regular className={styles.emptyIcon} />
          <Text className={styles.emptyText}>{t("task.empty")}</Text>
          <Button
            appearance="primary"
            icon={<Add20Regular />}
            onClick={onNewTask}
          >
            {t("task.new")}
          </Button>
        </div>
      ) : (
        <>
          <div className={styles.listHeader}>
            <span>{t("task.name")}</span>
            <span>{t("task.nextRun")}</span>
            <span>{t("task.status")}</span>
            <span>{t("task.active")}</span>
            <span>{t("task.actions")}</span>
          </div>
          <div className={styles.listContainer}>
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
          </div>
        </>
      )}
    </div>
  );
}
