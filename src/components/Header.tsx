import {
  Button,
  Text,
  ToolbarButton,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { Settings24Regular, Add24Regular } from "@fluentui/react-icons";
import { useI18n } from "../i18n";

const useStyles = makeStyles({
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  title: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase500,
  },
  actions: {
    display: "flex",
    gap: tokens.spacingHorizontalS,
    alignItems: "center",
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
      <Text className={styles.title}>{t("app.title")}</Text>
      <div className={styles.actions}>
        <ToolbarButton
          icon={<Settings24Regular />}
          aria-label={t("settings.title")}
          onClick={onOpenSettings}
        />
        <Button
          appearance="primary"
          icon={<Add24Regular />}
          onClick={onNewTask}
        >
          {t("task.new")}
        </Button>
      </div>
    </div>
  );
}
