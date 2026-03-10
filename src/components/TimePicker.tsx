import { Input, makeStyles } from "@fluentui/react-components";

const useStyles = makeStyles({
  input: {
    width: "140px",
  },
});

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function TimePicker({ value, onChange }: TimePickerProps) {
  const styles = useStyles();

  return (
    <Input
      className={styles.input}
      type="time"
      size="small"
      value={value}
      onChange={(_, data) => onChange(data.value)}
    />
  );
}
