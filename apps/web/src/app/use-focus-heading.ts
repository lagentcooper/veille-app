import { useEffect, useRef } from "react";

/** Moves keyboard/screen-reader focus to the heading when a screen or step appears. */
export function useFocusHeading(dependency: unknown) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, [dependency]);
  return ref;
}
