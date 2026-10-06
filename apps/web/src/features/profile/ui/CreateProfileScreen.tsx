import { Alert, Button, Stepper, TextField } from "@veille/ui";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useFocusHeading } from "../../../app/use-focus-heading";
import { checkCode } from "../domain/code-policy";
import { isValidFirstName } from "../domain/profile";

type Step = "name" | "code" | "confirm";
const ORDER: readonly Step[] = ["name", "code", "confirm"];

export function CreateProfileScreen({
  onCreate,
}: {
  onCreate: (input: { firstName: string; code: string }) => Promise<boolean>;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("name");
  const [firstName, setFirstName] = useState("");
  const [code, setCode] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const heading = useFocusHeading(step);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (step === "name") {
      if (!isValidFirstName(firstName)) return setError(t("create.name.required"));
      return setStep("code");
    }
    if (step === "code") {
      const problem = checkCode(code);
      if (problem) return setError(t(`create.code.${problem}`));
      return setStep("confirm");
    }
    if (again !== code) return setError(t("create.confirm.mismatch"));
    setWorking(true);
    const created = await onCreate({ firstName, code });
    if (!created) setWorking(false);
  };

  return (
    <form className="v-stack" onSubmit={(e) => void submit(e)} noValidate>
      <Stepper
        label={t("create.stepsLabel")}
        steps={ORDER.map((s) => t(`create.steps.${s}`))}
        current={ORDER.indexOf(step)}
        currentLabel={t("create.currentStep")}
      />
      {step === "name" && (
        <>
          <h1 ref={heading} tabIndex={-1}>
            {t("create.name.title")}
          </h1>
          <TextField
            label={t("create.name.label")}
            hint={t("create.name.hint")}
            error={error}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
            maxLength={40}
          />
          <Button type="submit" block>
            {t("create.name.next")}
          </Button>
        </>
      )}
      {step === "code" && (
        <>
          <h1 ref={heading} tabIndex={-1}>
            {t("create.code.title")}
          </h1>
          <Alert tone="warning">{t("create.code.warning")}</Alert>
          <TextField
            code
            label={t("create.code.label")}
            hint={t("create.code.hint")}
            error={error}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
          />
          <Button type="submit" block>
            {t("create.code.next")}
          </Button>
          <Button
            variant="secondary"
            block
            onClick={() => {
              setError(null);
              setStep("name");
            }}
          >
            {t("create.code.back")}
          </Button>
        </>
      )}
      {step === "confirm" && (
        <>
          <h1 ref={heading} tabIndex={-1}>
            {t("create.confirm.title")}
          </h1>
          <TextField
            code
            label={t("create.confirm.label")}
            error={error}
            value={again}
            onChange={(e) => setAgain(e.target.value)}
            maxLength={6}
            disabled={working}
          />
          {working ? <p role="status">{t("create.confirm.working")}</p> : null}
          <Button type="submit" block disabled={working}>
            {t("create.confirm.submit")}
          </Button>
          <Button
            variant="secondary"
            block
            disabled={working}
            onClick={() => {
              setError(null);
              setAgain("");
              setStep("code");
            }}
          >
            {t("create.confirm.back")}
          </Button>
        </>
      )}
    </form>
  );
}
