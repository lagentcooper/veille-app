import type { HTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export type AlertTone = "info" | "warning" | "danger" | "success";

const ICON: Record<AlertTone, IconName> = {
  info: "info",
  warning: "alert-triangle",
  danger: "alert-octagon",
  success: "check-circle",
};

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  tone?: AlertTone;
  title?: ReactNode;
}

export function Alert({ tone = "info", title, children, className, ...rest }: AlertProps) {
  return (
    <div className={["v-alert", `v-alert--${tone}`, className].filter(Boolean).join(" ")} {...rest}>
      <Icon name={ICON[tone]} />
      <div className="v-alert__body">
        {title ? <strong className="v-alert__title">{title}</strong> : null}
        {children}
      </div>
    </div>
  );
}
