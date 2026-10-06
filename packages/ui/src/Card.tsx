import type { HTMLAttributes } from "react";
import type { Tone } from "./Badge";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Adds a coloured spine on the start edge. The text still sits on white. */
  tone?: Exclude<Tone, "info">;
}

export function Card({ className, tone, ...rest }: CardProps) {
  return (
    <section
      className={["v-card", tone && `v-card--${tone}`, className].filter(Boolean).join(" ")}
      {...rest}
    />
  );
}
