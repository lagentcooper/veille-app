import "@veille/ui/styles.css";
import "./app/app.css";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { ConsoleLogger } from "./adapters/console-logger";
import { IndexedDbStorage } from "./adapters/indexeddb-storage";
import { MemoryKeyStore } from "./adapters/memory-key-store";
import { SystemClock } from "./adapters/system-clock";
import { WebCryptoProvider } from "./adapters/webcrypto-provider";
import { IsoClock, WebCryptoHasher } from "./adapters/sha256-hasher";
import { App } from "./app/App";
import { SessionProvider } from "./app/session";
import { ProfileService } from "./features/profile/data/profile-service";
import { WillRepository } from "./features/will/data/will-repository";
import type { WillServices } from "./features/will/ui/WillWorkspace";
import { initI18n } from "./i18n";
import { registerServiceWorker, type UpdateHandle } from "./pwa/register-sw";

const storage = new IndexedDbStorage();
const crypto_ = new WebCryptoProvider();
const keys = new MemoryKeyStore();
const clock = new SystemClock();
const logger = new ConsoleLogger();
const hasher = new WebCryptoHasher();
const profiles = new ProfileService({ storage, crypto: crypto_, keys, clock, logger });
const will: WillServices = {
  repository: new WillRepository({ storage, crypto: crypto_, keys, hasher, logger }),
  env: { clock: new IsoClock(), hasher },
  clock,
};

let setUpdate: (handle: UpdateHandle) => void = () => undefined;
registerServiceWorker((handle) => setUpdate(handle));

function Root() {
  const [update, setUpdateState] = useState<UpdateHandle | null>(null);
  setUpdate = (handle) => setUpdateState(handle);
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <SessionProvider profiles={profiles} storage={storage}>
        <App update={update} will={will} />
      </SessionProvider>
    </BrowserRouter>
  );
}

void initI18n().then(() => {
  const root = document.getElementById("root");
  if (!root) throw new Error("#root missing");
  createRoot(root).render(
    <StrictMode>
      <Root />
    </StrictMode>,
  );
});
