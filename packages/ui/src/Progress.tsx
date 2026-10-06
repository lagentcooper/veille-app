export interface ProgressProps {
  /** Accessible name, e.g. "Avancement". */
  label: string;
  value: number;
  max: number;
  /** Visible text such as "Question 3 sur 12". */
  text: string;
}

/** Native <progress>: announced by assistive technology without ARIA gymnastics. */
export function Progress({ label, value, max, text }: ProgressProps) {
  return (
    <div className="v-progress">
      <p className="v-progress__text">{text}</p>
      <progress className="v-progress__bar" aria-label={label} value={value} max={max} />
    </div>
  );
}
