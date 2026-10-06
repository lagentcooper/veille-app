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
import { App } from "./app/App";
import { SessionProvider } from "./app/session";
import { ProfileService } from "./features/profile/data/profile-service";
import { initI18n } from "./i18n";
import { registerServiceWorker, type UpdateHandle } from "./pwa/register-sw";

const storage = new IndexedDbStorage();
const profiles = new ProfileService({
  storage,
  crypto: new WebCryptoProvider(),
  keys: new MemoryKeyStore(),
  clock: new SystemClock(),
  logger: new ConsoleLogger(),
});

let setUpdate: (handle: UpdateHandle) => void = () => undefined;
registerServiceWorker((handle) => setUpdate(handle));

function Root() {
  const [update, setUpdateState] = useState<UpdateHandle | null>(null);
  setUpdate = (handle) => setUpdateState(handle);
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <SessionProvider profiles={profiles} storage={storage}>
        <App update={update} />
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
