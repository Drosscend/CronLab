import { Badge } from "@fluentui/react-components";
import { useI18n } from "../i18n";

interface StatusBadgeProps {
  status: string;
  appearance?: "tint" | "filled";
  size?: "small" | "medium" | "large";
}

export function StatusBadge({
  status,
  appearance = "tint",
  size = "small",
}: StatusBadgeProps) {
  const { t } = useI18n();
  switch (status) {
    case "success":
      return <Badge appearance={appearance} color="success" size={size}>{t("status.success")}</Badge>;
    case "failed":
      return <Badge appearance={appearance} color="danger" size={size}>{t("status.failed")}</Badge>;
    case "timeout":
      return <Badge appearance={appearance} color="warning" size={size}>{t("status.timeout")}</Badge>;
    case "running":
      return <Badge appearance={appearance} color="informative" size={size}>{t("status.running")}</Badge>;
    default:
      return <Badge appearance="outline" color="subtle" size={size}>{t("status.never")}</Badge>;
  }
}
