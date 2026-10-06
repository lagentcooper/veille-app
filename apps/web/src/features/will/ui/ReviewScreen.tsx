import { Alert, Callout, Card, Icon, Meter } from "@veille/ui";
import type { Assessment, Finding } from "@veille/core/will";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useFocusHeading } from "../../../app/use-focus-heading";
import { draftSteps } from "../domain/draft-steps";
import { recordSteps } from "../domain/record-steps";
import { groupFindings } from "../domain/review-groups";
import { statusOf, type ObjectKey, type ObjectStatus } from "../domain/status";
import { stepForField, type Step } from "../domain/steps";
import { wishesSteps } from "../domain/wishes-steps";
import { FindingsList } from "./FindingsList";
import { EXPORT, stepPath } from "./paths";
import { STATUS_TONE, StatusPill } from "./StatusPill";
import { useStepTitle } from "./use-step-title";
import { assessWorkspace, useWill } from "./WillWorkspace";
import { resumeTargets } from "./WizardRoutes";

interface Row {
  key: ObjectKey;
  label: string;
  assessment: Assessment;
  steps: readonly Step<never>[];
}

function Legend() {
  const { t } = useTranslation();
  const rows: ReadonlyArray<{ status: ObjectStatus; text: string }> = [
    { status: "complete", text: t("will.review.legend.complete") },
    { status: "incomplete", text: t("will.review.legend.incomplete") },
    { status: "professional-required", text: t("will.review.legend.professional") },
    { status: "not-started", text: t("will.review.legend.notStarted") },
  ];
  return (
    <Callout title={t("will.review.legend.title")} icon="info" defaultOpen={false}>
      <ul className="will-legend">
        {rows.map((r) => (
          <li key={r.status}>
            <StatusPill status={r.status} />
            <span>{r.text}</span>
          </li>
        ))}
      </ul>
    </Callout>
  );
}

const SHOWN = 5;

/** The questions still to answer. Beyond a handful, the rest folds away so the page stays readable. */
function TodoList({
  rowKey,
  steps,
  title,
}: {
  rowKey: ObjectKey;
  steps: readonly Step<never>[];
  title: (step: Step<never>) => string;
}) {
  const { t } = useTranslation();
  const item = (step: Step<never>) => {
    const question = title(step);
    return (
      <li key={step.id}>
        <span>{question}</span>
        <Link
          to={stepPath(rowKey, step.id)}
          aria-label={t("will.review.toAnswer.actionFor", { question })}
        >
          {t("will.review.toAnswer.action")}
          <Icon name="arrow-right" />
        </Link>
      </li>
    );
  };
  const rest = steps.slice(SHOWN);
  return (
    <>
      <ul className="will-todo">{steps.slice(0, SHOWN).map(item)}</ul>
      {rest.length > 0 ? (
        <details className="will-more">
          <summary>{t("will.review.toAnswer.more", { count: rest.length })}</summary>
          <ul className="will-todo">{rest.map(item)}</ul>
        </details>
      ) : null}
    </>
  );
}

/**
 * The checklist ("Faire le point"). For each part: how far along it is, then ONLY what the person
 * can do about it — questions still to answer (named by the question itself), points to double-check,
 * and situations that need a professional. A 🛑 stops here: no PDF of the text to copy is offered, and
 * the notary is presented as the right next step, not an option.
 */
export function ReviewScreen() {
  const { t } = useTranslation();
  const stepTitle = useStepTitle();
  const { state } = useWill();
  const heading = useFocusHeading(null);
  if (state.status !== "ready") return null;
  const ws = state.workspace;
  const a = assessWorkspace(ws);
  const targets = resumeTargets(ws);

  const rows: Row[] = [
    {
      key: "draft",
      label: t("will.review.objects.draft"),
      assessment: a.draft,
      steps: draftSteps(ws.draft) as unknown as Step<never>[],
    },
    {
      key: "wishes",
      label: t("will.review.objects.wishes"),
      assessment: a.wishes,
      steps: wishesSteps(ws.wishes) as unknown as Step<never>[],
    },
    {
      key: "physicalRecord",
      label: t("will.review.objects.record"),
      assessment: a.record,
      steps: recordSteps(ws.physicalRecord) as unknown as Step<never>[],
    },
  ];

  const statuses = rows.map((r) => ({ row: r, status: statusOf(r.key, ws[r.key], r.assessment) }));
  const touched = statuses.filter((s) => s.status !== "not-started");
  const blocked = touched.some((s) => s.row.assessment.blocksReviewStep);
  const incomplete = touched.some((s) => s.row.assessment.level === "incomplete");
  const advice = touched.some((s) => s.row.assessment.notaryAdvice === "required")
    ? "required"
    : "recommended";

  const fixPath = (row: Row) => (f: Finding) => {
    const id = stepForField(row.steps, f.field);
    return f.field ? stepPath(row.key, id) : null;
  };

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

      <Card aria-labelledby="review-summary">
        <h2 id="review-summary">{t("will.review.summaryTitle")}</h2>
        <ul className="will-summary">
          {statuses.map(({ row, status }) => (
            <li key={row.key}>
              <span>{row.label}</span>
              <StatusPill status={status} />
            </li>
          ))}
        </ul>
        <Legend />
      </Card>

      {statuses.map(({ row, status }) => {
        const groups = groupFindings(row.steps, row.assessment.findings);
        return (
          <Card
            key={row.key}
            tone={STATUS_TONE[status]}
            className="will-part"
            aria-labelledby={`review-${row.key}`}
          >
            <div className="will-part__head">
              <h2 id={`review-${row.key}`}>{row.label}</h2>
              <StatusPill status={status} />
            </div>

            {status === "not-started" ? (
              <>
                <p>{t("will.review.notStarted")}</p>
                <Link className="v-button v-button--secondary" to={stepPath(row.key)}>
                  {t("will.hub.start")}
                </Link>
              </>
            ) : (
              <>
                <Meter
                  label={t("will.review.meterLabel")}
                  value={groups.answered}
                  max={groups.total}
                  text={t("will.review.progress", { done: groups.answered, total: groups.total })}
                />

                {groups.blocking.length > 0 ? (
                  <section className="will-group" aria-labelledby={`blk-${row.key}`}>
                    <h3 id={`blk-${row.key}`}>{t("will.review.blocking.title")}</h3>
                    <p className="v-field__hint">{t("will.review.blocking.hint")}</p>
                    <FindingsList findings={groups.blocking} fixPath={fixPath(row)} />
                  </section>
                ) : null}

                {groups.toAnswer.length > 0 ? (
                  <section className="will-group" aria-labelledby={`ans-${row.key}`}>
                    <h3 id={`ans-${row.key}`}>
                      {t("will.review.toAnswer.title", { count: groups.toAnswer.length })}
                    </h3>
                    <p className="v-field__hint">{t("will.review.toAnswer.hint")}</p>
                    <TodoList rowKey={row.key} steps={groups.toAnswer} title={stepTitle} />
                  </section>
                ) : null}

                {groups.toCheck.length > 0 ? (
                  <section className="will-group" aria-labelledby={`chk-${row.key}`}>
                    <h3 id={`chk-${row.key}`}>{t("will.review.toCheck.title")}</h3>
                    <p className="v-field__hint">{t("will.review.toCheck.hint")}</p>
                    <FindingsList findings={groups.toCheck} fixPath={fixPath(row)} />
                  </section>
                ) : null}

                {row.assessment.findings.length === 0 ? (
                  <p>{t("will.review.noFindings")}</p>
                ) : groups.toAnswer.length > 1 ? (
                  <Link className="v-button" to={targets[row.key]}>
                    {t("will.review.continue")}
                  </Link>
                ) : null}
              </>
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
