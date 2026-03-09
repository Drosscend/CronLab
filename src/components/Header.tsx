import {
  Button,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { Settings20Regular, Add20Regular } from "@fluentui/react-icons";
import { useI18n } from "../i18n";

const useStyles = makeStyles({
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    minHeight: "48px",
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
  },
});

interface HeaderProps {
  onNewTask: () => void;
  onOpenSettings: () => void;
}

export function Header({ onNewTask, onOpenSettings }: HeaderProps) {
  const styles = useStyles();
  const { t } = useI18n();

  return (
    <div className={styles.header}>
      <div className={styles.left}>
        <Button
          appearance="outline"
          icon={<Add20Regular />}
          onClick={onNewTask}
        >
          {t("task.new")}
        </Button>
      </div>
      <div className={styles.right}>
        <Button
          icon={<Settings20Regular />}
          appearance="subtle"
          aria-label={t("settings.title")}
          onClick={onOpenSettings}
        />
      </div>
    </div>
  );
}
