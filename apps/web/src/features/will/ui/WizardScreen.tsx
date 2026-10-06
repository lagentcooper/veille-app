import { Alert, Button, Checkbox, ChoiceGroup, Progress, TextArea, TextField } from "@veille/ui";
import { HANDWRITING_GUIDE_STEP_KEYS } from "@veille/core/will";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useFocusHeading } from "../../../app/use-focus-heading";
import { indexOfStep, type Step } from "../domain/steps";

const ANSWERS = ["yes", "no", "unknown"] as const;

interface Props<T> {
  steps: readonly Step<T>[];
  doc: T;
  /** Current screen id from the URL; falls back to the first one. */
  stepId: string | null;
  onEdit: (edit: (doc: T) => T) => void;
  newId: () => string;
  goTo: (stepId: string) => void;
  onExit: () => void;
  onFinish: () => void;
}

/** One question per screen, driven by a declarative list of steps. */
export function WizardScreen<T>({
  steps,
  doc,
  stepId,
  onEdit,
  newId,
  goTo,
  onExit,
  onFinish,
}: Props<T>) {
  const { t, i18n } = useTranslation();
  const index = indexOfStep(steps, stepId);
  const step = steps[index]!;
  const heading = useFocusHeading(step.id);
  const [unknownPicked, setUnknownPicked] = useState<string | null>(null);

  const last = index === steps.length - 1;
  const next = () => (last ? onFinish() : goTo(steps[index + 1]!.id));
  const back = () => (index === 0 ? onExit() : goTo(steps[index - 1]!.id));

  const base = `will.q.${step.key}`;
  const rawName = step.params?.["name"];
  const title = (() => {
    if (step.kind === "more") return t(`${base}.${step.hasAny ? "title" : "first"}`);
    if (rawName !== undefined && rawName.trim() === "" && i18n.exists(`${base}.titleNoName`))
      return t(`${base}.titleNoName`);
    const name = rawName?.trim() ? rawName.trim() : t("will.wizard.unnamedPerson");
    return t(`${base}.title`, { ...step.params, name });
  })();
  const hint = i18n.exists(`${base}.hint`) ? t(`${base}.hint`) : "";
  const label = i18n.exists(`${base}.label`) ? t(`${base}.label`) : title;

  const answered = (() => {
    switch (step.kind) {
      case "text":
      case "longText":
        return step.get(doc).trim().length > 0;
      case "answer":
        return step.get(doc) !== "unknown" || unknownPicked === step.id;
      case "choice":
        return step.get(doc) !== "";
      case "ack":
        return step.get(doc);
      case "more":
        return true;
    }
  })();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    next();
  };

  const primary = last
    ? t("will.wizard.finish")
    : answered
      ? t("will.wizard.next")
      : t("will.wizard.skip");

  return (
    <form className="v-stack" onSubmit={submit} noValidate>
      <Progress
        label={t("will.wizard.progressLabel")}
        value={index + 1}
        max={steps.length}
        text={t("will.wizard.progress", { n: index + 1, total: steps.length })}
      />
      <h1 ref={heading} tabIndex={-1}>
        {title}
      </h1>

      {step.kind === "text" && (
        <TextField
          label={label}
          hint={hint}
          value={step.get(doc)}
          maxLength={step.maxLength}
          onChange={(e) => onEdit((d) => step.set(d, e.target.value))}
          autoComplete="off"
        />
      )}
      {step.kind === "longText" && (
        <TextArea
          label={label}
          hint={hint}
          value={step.get(doc)}
          maxLength={step.maxLength}
          onChange={(e) => onEdit((d) => step.set(d, e.target.value))}
        />
      )}
      {step.kind === "answer" && (
        <ChoiceGroup
          legend={t("will.wizard.yourAnswer")}
          hint={hint}
          options={ANSWERS.map((value) => ({ value, label: t(`will.options.answer.${value}`) }))}
          value={
            step.get(doc) === "unknown"
              ? unknownPicked === step.id
                ? "unknown"
                : null
              : step.get(doc)
          }
          onChange={(value) => {
            setUnknownPicked(value === "unknown" ? step.id : null);
            onEdit((d) => step.set(d, value as "yes" | "no" | "unknown"));
          }}
        />
      )}
      {step.kind === "choice" && (
        <ChoiceGroup
          legend={t("will.wizard.yourAnswer")}
          hint={hint}
          options={step.options.map((o) => ({
            value: o.value,
            label: o.label?.trim()
              ? o.label
              : o.label !== undefined
                ? t("will.wizard.unnamedPerson")
                : t(`${base}.options.${o.value}`),
          }))}
          value={step.get(doc) === "" ? null : step.get(doc)}
          onChange={(value) => onEdit((d) => step.set(d, value))}
        />
      )}
      {step.kind === "ack" && (
        <>
          {step.showGuide ? (
            <Alert tone="info" title={t("will.guide.title")}>
              <ol>
                {HANDWRITING_GUIDE_STEP_KEYS.map((key) => (
                  <li key={key}>{t(key)}</li>
                ))}
              </ol>
            </Alert>
          ) : null}
          <Checkbox
            label={label}
            checked={step.get(doc)}
            onChange={(e) => onEdit((d) => step.set(d, e.target.checked))}
          />
        </>
      )}

      {step.kind === "more" ? (
        <>
          <Button
            block
            onClick={() => {
              const added = step.add(doc, newId);
              onEdit(() => added.doc);
              goTo(added.goto);
            }}
          >
            {t(`${base}.yes`)}
          </Button>
          <Button variant="secondary" block onClick={next}>
            {t(`${base}.no`)}
          </Button>
        </>
      ) : (
        <>
          {!answered && !last ? <p className="v-field__hint">{t("will.wizard.skipHint")}</p> : null}
          <Button type="submit" block>
            {primary}
          </Button>
        </>
      )}
      <Button variant="secondary" block onClick={back}>
        {t("will.wizard.back")}
      </Button>
      <Button variant="secondary" block onClick={onExit}>
        {t("will.save.exit")}
      </Button>
    </form>
  );
}
