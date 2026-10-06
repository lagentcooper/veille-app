import { Card } from "@veille/ui";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useFocusHeading } from "../../../app/use-focus-heading";
import { statusOf, type ObjectKey } from "../domain/status";
import { EXPORT, HISTORY, REVIEW, stepPath } from "./paths";
import { StatusPill } from "./StatusPill";
import { assessWorkspace, useWill } from "./WillWorkspace";
import { resumeTargets } from "./WizardRoutes";

const CARDS: ReadonlyArray<{
  key: ObjectKey;
  i18n: "draft" | "wishes" | "record";
  assess: "draft" | "wishes" | "record";
}> = [
  { key: "draft", i18n: "draft", assess: "draft" },
  { key: "wishes", i18n: "wishes", assess: "wishes" },
  { key: "physicalRecord", i18n: "record", assess: "record" },
];

export function HubScreen() {
  const { t } = useTranslation();
  const { state } = useWill();
  const heading = useFocusHeading(null);
  if (state.status !== "ready") return null;
  const ws = state.workspace;
  const assessments = assessWorkspace(ws);
  const targets = resumeTargets(ws);

  return (
    <div className="v-stack">
      <h1 ref={heading} tabIndex={-1}>
        {t("will.hub.title")}
      </h1>
      <p>{t("will.hub.intro")}</p>
      {CARDS.map(({ key, i18n, assess }) => {
        const status = statusOf(key, ws[key], assessments[assess]);
        const label =
          status === "not-started"
            ? t("will.hub.start")
            : status === "complete"
              ? t("will.hub.edit")
              : t("will.hub.resume");
        return (
          <Card key={key} aria-labelledby={`hub-${key}`}>
            <h2 id={`hub-${key}`}>{t(`will.hub.cards.${i18n}.title`)}</h2>
            <p>{t(`will.hub.cards.${i18n}.body`)}</p>
            <p>
              <StatusPill status={status} />
            </p>
            <Link
              className="v-button"
              to={
                status === "incomplete" || status === "professional-required"
                  ? targets[key]
                  : stepPath(key)
              }
              aria-label={`${label} — ${t(`will.hub.cards.${i18n}.title`)}`}
            >
              {label}
            </Link>
          </Card>
        );
      })}
      <Card aria-labelledby="hub-review">
        <h2 id="hub-review">{t("will.hub.review")}</h2>
        <p>{t("will.hub.reviewBody")}</p>
        <Link className="v-button" to={REVIEW}>
          {t("will.hub.review")}
        </Link>
      </Card>
      <Link to={EXPORT}>{t("will.hub.export")}</Link>
      <Link to={HISTORY}>{t("will.hub.history")}</Link>
    </div>
  );
}
