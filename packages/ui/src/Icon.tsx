import type { ReactNode } from "react";

/** Small stroke icons, drawn here so nothing is fetched at run time (CSP: no external asset). */
const PATHS = {
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.7 2.7L16 9.5" />
    </>
  ),
  "alert-triangle": (
    <>
      <path d="M12 3.5L2.8 19.5h18.4L12 3.5z" />
      <path d="M12 10v4.2" />
      <path d="M12 17.2v.01" />
    </>
  ),
  "alert-octagon": (
    <>
      <path d="M8.2 3h7.6L21 8.2v7.6L15.8 21H8.2L3 15.8V8.2L8.2 3z" />
      <path d="M12 8v5" />
      <path d="M12 16.2v.01" />
    </>
  ),
  "circle-dashed": <circle cx="12" cy="12" r="9" strokeDasharray="3 3.2" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 7.8v.01" />
    </>
  ),
  pen: (
    <>
      <path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 013 3L8 19l-4 1z" />
      <path d="M14 7l3 3" />
    </>
  ),
  heart: (
    <path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0112 7.3 4.3 4.3 0 0119.5 10c0 5.6-7.5 10-7.5 10z" />
  ),
  "map-pin": (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  book: (
    <>
      <path d="M4 5.5A2.5 2.5 0 016.5 3H20v16H6.5A2.5 2.5 0 004 21.5v-16z" />
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6L12 3z" />
      <path d="M8.8 12l2.4 2.4 4-4.4" />
    </>
  ),
  "file-text": (
    <>
      <path d="M7 3h7l5 5v13H7V3z" />
      <path d="M14 3v5h5" />
      <path d="M9.5 13h6" />
      <path d="M9.5 17h6" />
    </>
  ),
  "arrow-right": (
    <>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </>
  ),
  "chevron-down": <path d="M6 9l6 6 6-6" />,
  user: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20c.8-3.6 3.6-5.4 7-5.4s6.2 1.8 7 5.4" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

export interface IconProps {
  name: IconName;
  className?: string;
}

/** Decorative by design: the meaning is always carried by the neighbouring words. */
export function Icon({ name, className }: IconProps) {
  return (
    <svg
      className={["v-icon", className].filter(Boolean).join(" ")}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
