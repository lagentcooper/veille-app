import { useId, type TextareaHTMLAttributes } from "react";

export interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> {
  label: string;
  hint?: string;
  error?: string | null;
}

export function TextArea({ label, hint, error, className, rows = 6, ...rest }: TextAreaProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;
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
      <textarea
        id={id}
        rows={rows}
        className={["v-field__input", "v-field__input--area", className].filter(Boolean).join(" ")}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
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
