export interface UpdateHandle {
  /** Tells the waiting worker to activate; the page reloads once it has taken over. */
  apply(): void;
}

/**
 * Registers the service worker (production only). An updated worker is never activated
 * silently: `onUpdate` is called and the user decides (ADR-0012, stale-cache risk).
 */
export function registerServiceWorker(onUpdate: (handle: UpdateHandle) => void): void {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  let applying = false;
  const url = `${import.meta.env.BASE_URL}sw.js`;
  window.addEventListener("load", () => {
    void navigator.serviceWorker
      .register(url, { scope: import.meta.env.BASE_URL })
      .then((registration) => {
        const offer = (worker: ServiceWorker) => {
          if (!navigator.serviceWorker.controller) return; // first install: nothing to update
          onUpdate({
            apply: () => {
              applying = true;
              worker.postMessage({ type: "SKIP_WAITING" });
            },
          });
        };
        if (registration.waiting) offer(registration.waiting);
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed") offer(worker);
          });
        });
      });
    // Reload only when the user accepted an update. The first install also fires
    // `controllerchange` (clients.claim) and must never interrupt what the user is doing.
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (applying) window.location.reload();
    });
  });
}
