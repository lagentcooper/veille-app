import { useTranslation } from "react-i18next";
import type { Step } from "../domain/steps";

/** The question of a screen, in words — shared by the wizard and by the checklist ("Faire le point"). */
export function useStepTitle(): <T>(step: Step<T>) => string {
  const { t, i18n } = useTranslation();
  return (step) => {
    const base = `will.q.${step.key}`;
    if (step.kind === "more") return t(`${base}.${step.hasAny ? "title" : "first"}`);
    const rawName = step.params?.["name"];
    if (rawName !== undefined && rawName.trim() === "" && i18n.exists(`${base}.titleNoName`))
      return t(`${base}.titleNoName`);
    const name = rawName?.trim() ? rawName.trim() : t("will.wizard.unnamedPerson");
    return t(`${base}.title`, { ...step.params, name });
  };
}
