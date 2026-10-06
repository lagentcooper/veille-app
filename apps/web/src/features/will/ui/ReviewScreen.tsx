import { Alert, Card } from "@veille/ui";
import type { Assessment, Finding } from "@veille/core/will";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useFocusHeading } from "../../../app/use-focus-heading";
import { draftSteps } from "../domain/draft-steps";
import { recordSteps } from "../domain/record-steps";
import { statusOf, type ObjectKey } from "../domain/status";
import { stepForField } from "../domain/steps";
import { wishesSteps } from "../domain/wishes-steps";
import { FindingsList } from "./FindingsList";
import { EXPORT, stepPath } from "./paths";
import { StatusPill } from "./StatusPill";
import { assessWorkspace, useWill } from "./WillWorkspace";

/**
 * The checklist: ✅ complete · ⚠️ missing · 🛑 consult a professional. A 🛑 stops here: no PDF of
 * the text to copy is offered, and the notary is presented as the right next step, not an option.
 */
export function ReviewScreen() {
  const { t } = useTranslation();
  const { state } = useWill();
  const heading = useFocusHeading(null);
  if (state.status !== "ready") return null;
  const ws = state.workspace;
  const a = assessWorkspace(ws);

  const rows: ReadonlyArray<{
    key: ObjectKey;
    label: string;
    assessment: Assessment;
    fix: (f: Finding) => string | null;
  }> = [
    {
      key: "draft",
      label: t("will.review.objects.draft"),
      assessment: a.draft,
      fix: (f) => {
        const id = stepForField(draftSteps(ws.draft), f.field);
        return f.field ? stepPath("draft", id) : null;
      },
    },
    {
      key: "wishes",
      label: t("will.review.objects.wishes"),
      assessment: a.wishes,
      fix: (f) =>
        f.field ? stepPath("wishes", stepForField(wishesSteps(ws.wishes), f.field)) : null,
    },
    {
      key: "physicalRecord",
      label: t("will.review.objects.record"),
      assessment: a.record,
      fix: (f) =>
        f.field
          ? stepPath("physicalRecord", stepForField(recordSteps(ws.physicalRecord), f.field))
          : null,
    },
  ];

  const touched = rows.filter((r) => statusOf(r.key, ws[r.key], r.assessment) !== "not-started");
  const blocked = touched.some((r) => r.assessment.blocksReviewStep);
  const incomplete = touched.some((r) => r.assessment.level === "incomplete");
  const advice = touched.some((r) => r.assessment.notaryAdvice === "required")
    ? "required"
    : "recommended";

  return (
    <div className="v-stack">
      <h1 ref={heading} tabIndex={-1}>
        {t("will.review.title")}
      </h1>
      <p>{t("will.review.intro")}</p>

      {touched.length > 0 && !blocked && !incomplete ? (
        <Alert tone="success">{t("will.review.allComplete")}</Alert>
      ) : null}
      {blocked ? <Alert tone="danger">{t("will.review.blockedExport")}</Alert> : null}
      {!blocked && incomplete ? (
        <Alert tone="warning">{t("will.review.somethingMissing")}</Alert>
      ) : null}

      {rows.map((r) => {
        const status = statusOf(r.key, ws[r.key], r.assessment);
        return (
          <Card key={r.key} aria-labelledby={`review-${r.key}`}>
            <h2 id={`review-${r.key}`}>{r.label}</h2>
            <p>
              <StatusPill status={status} />
            </p>
            {status === "not-started" ? (
              <Link to={stepPath(r.key)}>{t("will.hub.start")}</Link>
            ) : r.assessment.findings.length === 0 ? (
              <p>{t("will.review.noFindings")}</p>
            ) : (
              <FindingsList findings={r.assessment.findings} fixPath={r.fix} />
            )}
          </Card>
        );
      })}

      <Alert tone={advice === "required" ? "danger" : "info"} title={t("will.review.notary.title")}>
        {t(`will.review.notary.${advice}`)}
      </Alert>

      <Link className="v-button" to={EXPORT}>
        {t("will.review.toExport")}
      </Link>
    </div>
  );
}
