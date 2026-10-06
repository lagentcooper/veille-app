import { useTranslation } from "react-i18next";
import type { ObjectStatus } from "../domain/status";

const LABEL: Record<ObjectStatus, string> = {
  "not-started": "notStarted",
  complete: "complete",
  incomplete: "incomplete",
  "professional-required": "professional-required",
};

const SYMBOL: Record<ObjectStatus, string> = {
  "not-started": "○",
  complete: "✅",
  incomplete: "⚠️",
  "professional-required": "🛑",
};

/** Symbol AND words: the state is never conveyed by colour or by an icon alone. */
export function StatusPill({ status }: { status: ObjectStatus }) {
  const { t } = useTranslation();
  return (
    <span className="will-status" data-status={status}>
      <span aria-hidden="true">{SYMBOL[status]}</span> {t(`will.status.${LABEL[status]}`)}
    </span>
  );
}
