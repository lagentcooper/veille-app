import { Badge, type IconName, type Tone } from "@veille/ui";
import { useTranslation } from "react-i18next";
import type { ObjectStatus } from "../domain/status";

const LABEL: Record<ObjectStatus, string> = {
  "not-started": "notStarted",
  complete: "complete",
  incomplete: "incomplete",
  "professional-required": "professional-required",
};

export const STATUS_TONE: Record<ObjectStatus, Exclude<Tone, "info">> = {
  "not-started": "neutral",
  complete: "success",
  incomplete: "warning",
  "professional-required": "danger",
};

const ICON: Record<ObjectStatus, IconName> = {
  "not-started": "circle-dashed",
  complete: "check-circle",
  incomplete: "alert-triangle",
  "professional-required": "alert-octagon",
};

/** Icon, colour AND words: the state is never conveyed by colour or by an icon alone. */
export function StatusPill({ status }: { status: ObjectStatus }) {
  const { t } = useTranslation();
  return (
    <Badge tone={STATUS_TONE[status]} icon={ICON[status]} data-status={status}>
      {t(`will.status.${LABEL[status]}`)}
    </Badge>
  );
}
