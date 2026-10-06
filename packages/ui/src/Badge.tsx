import type { HTMLAttributes } from "react";
import { Icon, type IconName } from "./Icon";

export type Tone = "success" | "warning" | "danger" | "neutral" | "info";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone: Tone;
  icon?: IconName;
}

/** Icon AND words: a state is never conveyed by colour or by an icon alone. */
export function Badge({ tone, icon, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={["v-badge", `v-badge--${tone}`, className].filter(Boolean).join(" ")}
      {...rest}
    >
      {icon ? <Icon name={icon} /> : null}
      {children}
    </span>
  );
}
