export interface MeterProps {
  /** Accessible name, e.g. "Réponses données". */
  label: string;
  value: number;
  max: number;
  /** The same information in words: "5 réponses sur 8". Never rely on the bar alone. */
  text: string;
}

/** Segmented bar for "n out of m" with the numbers written out. */
export function Meter({ label, value, max, text }: MeterProps) {
  const segments = Math.min(max, 12);
  const on = Math.round((value / Math.max(max, 1)) * segments);
  return (
    <div>
      <p className="v-progress__text">{text}</p>
      <ol className="v-meter" aria-label={label}>
        {Array.from({ length: segments }, (_, i) => (
          <li key={i} className="v-meter__segment" data-on={i < on} />
        ))}
      </ol>
    </div>
  );
}
