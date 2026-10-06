import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export interface CalloutProps {
  title: string;
  icon?: IconName;
  /** Open on first render (default): the reader sees the explanation and may fold it. */
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

/** A documentation insert: native <details>, keyboard and screen-reader ready without any script. */
export function Callout({
  title,
  icon = "book",
  defaultOpen = true,
  children,
  className,
}: CalloutProps) {
  return (
    <details className={["v-callout", className].filter(Boolean).join(" ")} open={defaultOpen}>
      <summary className="v-callout__summary">
        <Icon name={icon} />
        <span className="v-callout__title">{title}</span>
        <Icon name="chevron-down" className="v-callout__chevron" />
      </summary>
      <div className="v-callout__body">{children}</div>
    </details>
  );
}
