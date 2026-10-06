import { useTranslation } from "react-i18next";

/** Permanent, non dismissible: it is a safety control, not a courtesy (ADR-0011, threat model R29). */
export function EvaluationBanner() {
  const { t } = useTranslation();
  return (
    <div className="app-banner" role="region" aria-label={t("banner.title")}>
      <strong>{t("banner.title")}</strong> — {t("banner.body")}
    </div>
  );
}
