import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  block?: boolean;
}

export function Button({
  variant = "primary",
  block = false,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  const classes = [
    "v-button",
    variant !== "primary" && `v-button--${variant}`,
    block && "v-button--block",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <button type={type} className={classes} {...rest} />;
}
