import { useId, type ReactNode } from "react";

export interface ChoiceOption {
  value: string;
  label: ReactNode;
}

export interface ChoiceGroupProps {
  legend: string;
  hint?: string;
  options: readonly ChoiceOption[];
  /** Selected value, or null when nothing is selected. */
  value: string | null;
  onChange: (value: string) => void;
  /** Receives the first radio so a screen can move focus to the question. */
  firstRef?: React.Ref<HTMLInputElement>;
}

/** One question, a few exclusive answers: native radio buttons in a fieldset (keyboard and screen-reader ready). */
export function ChoiceGroup({
  legend,
  hint,
  options,
  value,
  onChange,
  firstRef,
}: ChoiceGroupProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <fieldset className="v-choice" aria-describedby={hint ? hintId : undefined}>
      <legend className="v-choice__legend">{legend}</legend>
      {hint ? (
        <span id={hintId} className="v-field__hint">
          {hint}
        </span>
      ) : null}
      {options.map((option, index) => (
        <label key={option.value} className="v-choice__option">
          <input
            type="radio"
            name={id}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            ref={index === 0 ? firstRef : undefined}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
