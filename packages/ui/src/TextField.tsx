import { useId, type InputHTMLAttributes } from "react";

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  hint?: string;
  error?: string | null;
  /** Numeric code entry: masked, numeric keypad, no autofill. */
  code?: boolean;
}

export function TextField({
  label,
  hint,
  error,
  code = false,
  className,
  ...rest
}: TextFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;
  const codeProps = code
    ? ({ type: "password", inputMode: "numeric", autoComplete: "off", pattern: "[0-9]*" } as const)
    : {};
  return (
    <div className="v-field">
      <label className="v-field__label" htmlFor={id}>
        {label}
      </label>
      {hint ? (
        <span id={hintId} className="v-field__hint">
          {hint}
        </span>
      ) : null}
      <input
        id={id}
        className={["v-field__input", code && "v-field__input--code", className]
          .filter(Boolean)
          .join(" ")}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...codeProps}
        {...rest}
      />
      {error ? (
        <span id={errorId} className="v-field__error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
