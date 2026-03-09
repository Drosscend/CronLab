import {
  Button,
  Input,
  Label,
  SpinButton,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { Add16Regular, Dismiss16Regular } from "@fluentui/react-icons";
import { useI18n } from "../i18n";

const useStyles = makeStyles({
  section: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
  },
  envRow: {
    display: "flex",
    gap: tokens.spacingHorizontalXS,
    alignItems: "center",
  },
  envInput: {
    flex: 1,
  },
});

interface TaskAdvancedProps {
  envVars: Record<string, string>;
  onEnvVarsChange: (envVars: Record<string, string>) => void;
  timeoutSeconds: number | null;
  onTimeoutChange: (timeout: number | null) => void;
  defaultTimeout: number;
}

export function TaskAdvanced({
  envVars,
  onEnvVarsChange,
  timeoutSeconds,
  onTimeoutChange,
  defaultTimeout,
}: TaskAdvancedProps) {
  const styles = useStyles();
  const { t } = useI18n();

  const entries = Object.entries(envVars);

  const addEnvVar = () => {
    onEnvVarsChange({ ...envVars, "": "" });
  };

  const updateKey = (_oldKey: string, newKey: string, index: number) => {
    const newVars: Record<string, string> = {};
    let i = 0;
    for (const [k, v] of Object.entries(envVars)) {
      if (i === index) {
        newVars[newKey] = v;
      } else {
        newVars[k] = v;
      }
      i++;
    }
    onEnvVarsChange(newVars);
  };

  const updateValue = (_key: string, value: string, index: number) => {
    const newVars: Record<string, string> = {};
    let i = 0;
    for (const [k, v] of Object.entries(envVars)) {
      newVars[k] = i === index ? value : v;
      i++;
    }
    onEnvVarsChange(newVars);
  };

  const removeEnvVar = (index: number) => {
    const newVars: Record<string, string> = {};
    let i = 0;
    for (const [k, v] of Object.entries(envVars)) {
      if (i !== index) {
        newVars[k] = v;
      }
      i++;
    }
    onEnvVarsChange(newVars);
  };

  return (
    <div className={styles.section}>
      <Label>{t("task.envVars")}</Label>
      {entries.map(([key, value], index) => (
        <div className={styles.envRow} key={index}>
          <Input
            className={styles.envInput}
            placeholder={t("task.envKey")}
            value={key}
            onChange={(_, data) => updateKey(key, data.value, index)}
          />
          <Input
            className={styles.envInput}
            placeholder={t("task.envValue")}
            value={value}
            onChange={(_, data) => updateValue(key, data.value, index)}
          />
          <Button
            icon={<Dismiss16Regular />}
            appearance="subtle"
            size="small"
            onClick={() => removeEnvVar(index)}
          />
        </div>
      ))}
      <Button
        icon={<Add16Regular />}
        appearance="subtle"
        size="small"
        onClick={addEnvVar}
      >
        {t("task.envAdd")}
      </Button>

      <Label>{t("task.timeout")}</Label>
      <SpinButton
        value={timeoutSeconds ?? undefined}
        placeholder={`${t("task.timeout")} (${defaultTimeout})`}
        min={1}
        onChange={(_, data) => {
          onTimeoutChange(
            data.value !== undefined && data.value !== null
              ? data.value
              : null
          );
        }}
      />
    </div>
  );
}
