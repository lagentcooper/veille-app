import { useEffect } from "react";
import { INACTIVITY_LOCK_MS } from "../features/profile/domain/auto-lock-policy";

/** Locks when the tab is hidden or after a period of inactivity. Active only while unlocked. */
export function useAutoLock(active: boolean, lock: () => void): void {
  useEffect(() => {
    if (!active) return;
    let timer = window.setTimeout(lock, INACTIVITY_LOCK_MS);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(lock, INACTIVITY_LOCK_MS);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") lock();
    };
    const events = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
    for (const e of events) window.addEventListener(e, reset, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(timer);
      for (const e of events) window.removeEventListener(e, reset);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active, lock]);
}
