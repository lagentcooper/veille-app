export interface StepperProps {
  /** Accessible name of the list, e.g. "Étapes". */
  label: string;
  steps: readonly string[];
  /** Zero-based index of the current step. */
  current: number;
  /** Spoken suffix for the current step, e.g. "étape en cours". */
  currentLabel: string;
}

export function Stepper({ label, steps, current, currentLabel }: StepperProps) {
  return (
    <ol className="v-stepper" aria-label={label}>
      {steps.map((step, index) => {
        const state = index < current ? "done" : index === current ? "current" : "todo";
        return (
          <li
            key={step}
            className="v-stepper__item"
            data-state={state}
            aria-current={state === "current" ? "step" : undefined}
          >
            {step}
            {state === "current" ? (
              <span className="v-visually-hidden"> ({currentLabel})</span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
