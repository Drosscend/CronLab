import {
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import { ChevronUp12Regular, ChevronDown12Regular } from "@fluentui/react-icons";

const useStyles = makeStyles({
  root: {
    display: "inline-flex",
    alignItems: "center",
    height: "32px",
    width: "fit-content",
  },
  input: {
    width: "40px",
    textAlign: "center" as const,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    outline: "none",
    background: tokens.colorNeutralBackground1,
    fontSize: tokens.fontSizeBase300,
    fontFamily: "inherit",
    color: tokens.colorNeutralForeground1,
    padding: "4px 2px",
    height: "32px",
  },
  separator: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    padding: "0 6px",
    userSelect: "none" as const,
  },
  spinGroup: {
    display: "inline-flex",
    alignItems: "center",
    gap: "2px",
  },
  arrows: {
    display: "flex",
    flexDirection: "column",
    gap: "1px",
    marginLeft: "2px",
  },
  arrowBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "18px",
    height: "14px",
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: "3px",
    background: tokens.colorNeutralBackground1,
    cursor: "pointer",
    color: tokens.colorNeutralForeground2,
    padding: 0,
    fontSize: "10px",
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

function wrap(val: number, min: number, max: number): number {
  if (val > max) return min;
  if (val < min) return max;
  return val;
}

export function TimePicker({ value, onChange }: TimePickerProps) {
  const styles = useStyles();
  const [hours, minutes] = parseTime(value);

  const setH = (h: number) => onChange(`${pad(wrap(h, 0, 23))}:${pad(minutes)}`);
  const setM = (m: number) => onChange(`${pad(hours)}:${pad(wrap(m, 0, 59))}`);

  const onHoursInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
    if (raw === "") return onChange(`00:${pad(minutes)}`);
    onChange(`${pad(Math.min(23, parseInt(raw, 10)))}:${pad(minutes)}`);
  };

  const onMinutesInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
    if (raw === "") return onChange(`${pad(hours)}:00`);
    onChange(`${pad(hours)}:${pad(Math.min(59, parseInt(raw, 10)))}`);
  };

  const onHoursKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") { e.preventDefault(); setH(hours + 1); }
    if (e.key === "ArrowDown") { e.preventDefault(); setH(hours - 1); }
  };

  const onMinutesKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") { e.preventDefault(); setM(minutes + 1); }
    if (e.key === "ArrowDown") { e.preventDefault(); setM(minutes - 1); }
  };

  return (
    <div className={styles.root}>
      <div className={styles.spinGroup}>
        <input
          className={styles.input}
          value={pad(hours)}
          onChange={onHoursInput}
          onKeyDown={onHoursKey}
          maxLength={2}
        />
        <div className={styles.arrows}>
          <button className={styles.arrowBtn} onClick={() => setH(hours + 1)} tabIndex={-1} type="button">
            <ChevronUp12Regular />
          </button>
          <button className={styles.arrowBtn} onClick={() => setH(hours - 1)} tabIndex={-1} type="button">
            <ChevronDown12Regular />
          </button>
        </div>
      </div>

      <Text className={styles.separator}>:</Text>

      <div className={styles.spinGroup}>
        <input
          className={styles.input}
          value={pad(minutes)}
          onChange={onMinutesInput}
          onKeyDown={onMinutesKey}
          maxLength={2}
        />
        <div className={styles.arrows}>
          <button className={styles.arrowBtn} onClick={() => setM(minutes + 1)} tabIndex={-1} type="button">
            <ChevronUp12Regular />
          </button>
          <button className={styles.arrowBtn} onClick={() => setM(minutes - 1)} tabIndex={-1} type="button">
            <ChevronDown12Regular />
          </button>
        </div>
      </div>
    </div>
  );
}
