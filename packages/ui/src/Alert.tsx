import type { HTMLAttributes, ReactNode } from "react";

export type AlertTone = "info" | "warning" | "danger" | "success";

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  tone?: AlertTone;
  title?: ReactNode;
}

export function Alert({ tone = "info", title, children, className, ...rest }: AlertProps) {
  return (
    <div className={["v-alert", `v-alert--${tone}`, className].filter(Boolean).join(" ")} {...rest}>
      {title ? <strong className="v-alert__title">{title}</strong> : null}
      {children}
    </div>
  );
}
