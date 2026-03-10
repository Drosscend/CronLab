import {
  Button,
  Dropdown,
  Label,
  Option,
  ProgressBar,
  SpinButton,
  Switch,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  ArrowLeft20Regular,
  ArrowSync20Regular,
  ArrowDownload20Regular,
  Checkmark20Regular,
  ErrorCircle20Regular,
  Open16Regular,
} from "@fluentui/react-icons";
import { useState, useEffect } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { Settings } from "../lib/types";
import { useI18n } from "../i18n";
import { useUpdater } from "../hooks/useUpdater";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    overflow: "hidden",
    backgroundColor: tokens.colorNeutralBackground2,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    minHeight: "48px",
  },
  title: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
  },
  content: {
    flex: 1,
    overflow: "auto",
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXS,
    marginBottom: tokens.spacingVerticalM,
  },
  switchRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    height: "36px",
  },
  switchLabel: {
    fontSize: tokens.fontSizeBase300,
  },
  fieldSpaced: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalXS,
    marginBottom: tokens.spacingVerticalM,
    marginTop: tokens.spacingVerticalM,
  },
  aboutSection: {
    marginTop: "auto",
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
  },
  aboutHeader: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
  },
  aboutName: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
  },
  aboutVersion: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  aboutLink: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorBrandForeground1,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    background: "none",
    border: "none",
    padding: 0,
    ":hover": {
      textDecorationLine: "underline",
    },
  },
  updateRow: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    marginTop: tokens.spacingVerticalXS,
  },
  updateStatus: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: tokens.spacingHorizontalS,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
});

const GITHUB_URL = "https://github.com/Drosscend/CronLab";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  settings: Settings | null;
  onSave: (settings: Settings) => void;
  appVersion: string;
}

export function SettingsPanel({
  open: isOpen,
  onClose,
  settings,
  onSave,
  appVersion,
}: SettingsPanelProps) {
  const styles = useStyles();
  const { t } = useI18n();
  const { status, version, progress, error, checkForUpdates, restartApp } = useUpdater();

  const [language, setLanguage] = useState<"fr" | "en">("fr");
  const [launchAtStartup, setLaunchAtStartup] = useState(true);
  const [closeToTray, setCloseToTray] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [defaultTimeout, setDefaultTimeout] = useState(1800);
  const [maxLogRetention, setMaxLogRetention] = useState(10);

  useEffect(() => {
    if (settings) {
      setLanguage(settings.language);
      setLaunchAtStartup(settings.launchAtStartup);
      setCloseToTray(settings.closeToTray);
      setNotifications(settings.notifications);
      setDefaultTimeout(settings.defaultTimeoutSeconds);
      setMaxLogRetention(settings.maxLogRetention);
    }
  }, [settings, isOpen]);

  const handleSave = () => {
    onSave({
      language,
      launchAtStartup,
      closeToTray,
      notifications,
      defaultTimeoutSeconds: defaultTimeout,
      maxLogRetention,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Button
          icon={<ArrowLeft20Regular />}
          appearance="subtle"
          size="small"
          onClick={onClose}
        />
        <Text className={styles.title}>{t("settings.title")}</Text>
      </div>

      <div className={styles.content}>
        <div className={styles.field}>
          <Label size="small">{t("settings.language")}</Label>
          <Dropdown
            value={language === "fr" ? "Français" : "English"}
            selectedOptions={[language]}
            onOptionSelect={(_, data) => setLanguage(data.optionValue as "fr" | "en")}
          >
            <Option value="fr">Français</Option>
            <Option value="en">English</Option>
          </Dropdown>
        </div>

        <div className={styles.switchRow}>
          <Text className={styles.switchLabel}>{t("settings.startup")}</Text>
          <Switch
            checked={launchAtStartup}
            onChange={(_, data) => setLaunchAtStartup(data.checked)}
          />
        </div>

        <div className={styles.switchRow}>
          <Text className={styles.switchLabel}>{t("settings.tray")}</Text>
          <Switch
            checked={closeToTray}
            onChange={(_, data) => setCloseToTray(data.checked)}
          />
        </div>

        <div className={styles.switchRow}>
          <Text className={styles.switchLabel}>{t("settings.notifications")}</Text>
          <Switch
            checked={notifications}
            onChange={(_, data) => setNotifications(data.checked)}
          />
        </div>

        <div className={styles.fieldSpaced}>
          <Label size="small">{t("settings.defaultTimeout")}</Label>
          <SpinButton
            value={defaultTimeout}
            min={10}
            onChange={(_, data) => {
              if (data.value !== undefined && data.value !== null) {
                setDefaultTimeout(data.value);
              }
            }}
          />
        </div>

        <div className={styles.field}>
          <Label size="small">{t("settings.logRetention")}</Label>
          <SpinButton
            value={maxLogRetention}
            min={1}
            max={100}
            onChange={(_, data) => {
              if (data.value !== undefined && data.value !== null) {
                setMaxLogRetention(data.value);
              }
            }}
          />
        </div>

      </div>

      <div className={styles.aboutSection}>
        <div className={styles.aboutHeader}>
          <Text className={styles.aboutName}>CronLab</Text>
          <Text className={styles.aboutVersion}>v{appVersion}</Text>
        </div>

        <button className={styles.aboutLink} onClick={() => openUrl(GITHUB_URL)}>
          GitHub <Open16Regular />
        </button>

        <div className={styles.updateRow}>
          {status === "installing" ? (
            <Button
              appearance="primary"
              size="small"
              icon={<ArrowDownload20Regular />}
              onClick={restartApp}
            >
              {t("update.restart")}
            </Button>
          ) : (
            <Button
              appearance="subtle"
              size="small"
              icon={<ArrowSync20Regular />}
              onClick={checkForUpdates}
              disabled={status === "checking" || status === "downloading"}
            >
              {t("update.checkNow")}
            </Button>
          )}

          {status === "checking" && (
            <Text className={styles.updateStatus}>{t("update.checking")}</Text>
          )}
          {status === "up-to-date" && (
            <Text className={styles.updateStatus}>
              <Checkmark20Regular /> {t("update.upToDate")}
            </Text>
          )}
          {status === "available" && version && (
            <Text className={styles.updateStatus}>
              {t("update.available", { version })}
            </Text>
          )}
          {status === "downloading" && (
            <Text className={styles.updateStatus}>
              {t("update.downloading", { progress: String(progress) })}
            </Text>
          )}
          {status === "installing" && (
            <Text className={styles.updateStatus}>{t("update.installing")}</Text>
          )}
          {status === "error" && (
            <Text className={styles.updateStatus}>
              <ErrorCircle20Regular /> {t("update.error")}: {error}
            </Text>
          )}
        </div>
        {status === "downloading" && (
          <ProgressBar value={progress / 100} />
        )}
      </div>

      <div className={styles.footer}>
        <Button appearance="secondary" size="small" onClick={onClose}>
          {t("task.cancel")}
        </Button>
        <Button appearance="primary" size="small" onClick={handleSave}>
          {t("settings.save")}
        </Button>
      </div>
    </div>
  );
}
