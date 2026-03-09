import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Label,
  Select,
  SpinButton,
  Switch,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { useState, useEffect } from "react";
import type { Settings } from "../lib/types";
import { useI18n } from "../i18n";

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
  switchField: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
});

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  settings: Settings | null;
  onSave: (settings: Settings) => void;
}

export function SettingsPanel({
  open: isOpen,
  onClose,
  settings,
  onSave,
}: SettingsPanelProps) {
  const styles = useStyles();
  const { t } = useI18n();

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

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(_, data) => {
        if (!data.open) onClose();
      }}
    >
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{t("settings.title")}</DialogTitle>
          <DialogContent>
            <div className={styles.form}>
              <div className={styles.field}>
                <Label>{t("settings.language")}</Label>
                <Select
                  value={language}
                  onChange={(_, data) =>
                    setLanguage(data.value as "fr" | "en")
                  }
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </Select>
              </div>

              <div className={styles.switchField}>
                <Label>{t("settings.startup")}</Label>
                <Switch
                  checked={launchAtStartup}
                  onChange={(_, data) => setLaunchAtStartup(data.checked)}
                />
              </div>

              <div className={styles.switchField}>
                <Label>{t("settings.tray")}</Label>
                <Switch
                  checked={closeToTray}
                  onChange={(_, data) => setCloseToTray(data.checked)}
                />
              </div>

              <div className={styles.switchField}>
                <Label>{t("settings.notifications")}</Label>
                <Switch
                  checked={notifications}
                  onChange={(_, data) => setNotifications(data.checked)}
                />
              </div>

              <div className={styles.field}>
                <Label>{t("settings.defaultTimeout")}</Label>
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
                <Label>{t("settings.logRetention")}</Label>
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
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose}>
              {t("task.cancel")}
            </Button>
            <Button appearance="primary" onClick={handleSave}>
              {t("settings.save")}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
