import {
  SpinButton,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";

const useStyles = makeStyles({
  root: {
    display: "inline-flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
  },
  separator: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    userSelect: "none",
  },
  spinButton: {
    width: "72px",
  },
});

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function parseTime(value: string): [number, number] {
  const [h, m] = value.split(":").map(Number);
  return [
    isNaN(h) ? 0 : Math.min(23, Math.max(0, h)),
    isNaN(m) ? 0 : Math.min(59, Math.max(0, m)),
  ];
}

export function TimePicker({ value, onChange }: TimePickerProps) {
  const styles = useStyles();
  const [hours, minutes] = parseTime(value);

  return (
    <div className={styles.root}>
      <SpinButton
        className={styles.spinButton}
        value={hours}
        displayValue={pad(hours)}
        min={0}
        max={23}
        size="small"
        onChange={(_, data) => {
          if (data.value !== undefined && data.value !== null) {
            const h = Math.min(23, Math.max(0, data.value));
            onChange(`${pad(h)}:${pad(minutes)}`);
          }
        }}
      />
      <Text className={styles.separator}>:</Text>
      <SpinButton
        className={styles.spinButton}
        value={minutes}
        displayValue={pad(minutes)}
        min={0}
        max={59}
        size="small"
        onChange={(_, data) => {
          if (data.value !== undefined && data.value !== null) {
            const m = Math.min(59, Math.max(0, data.value));
            onChange(`${pad(hours)}:${pad(m)}`);
          }
        }}
      />
    </div>
  );
}
