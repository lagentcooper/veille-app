import type { HTMLAttributes } from "react";

export function Card({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return <section className={["v-card", className].filter(Boolean).join(" ")} {...rest} />;
}
