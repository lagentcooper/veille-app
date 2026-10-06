import { Alert, Button } from "@veille/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Route, Routes } from "react-router";
import { CreateProfileScreen } from "../features/profile/ui/CreateProfileScreen";
import { UnlockScreen } from "../features/profile/ui/UnlockScreen";
import { WelcomeScreen } from "../features/profile/ui/WelcomeScreen";
import { DataLocationScreen } from "../features/shell/ui/DataLocationScreen";
import { AppHeader } from "../features/shell/ui/AppHeader";
import { EvaluationBanner } from "../features/shell/ui/EvaluationBanner";
import { HomeScreen } from "../features/shell/ui/HomeScreen";
import { WillWorkspaceProvider, type WillServices } from "../features/will/ui/WillWorkspace";
import { WillRoutes } from "../features/will/ui/WillRoutes";
import type { UpdateHandle } from "../pwa/register-sw";
import { useSession } from "./session";
import { useAutoLock } from "./use-auto-lock";

/** The will journey only exists while the application is unlocked: no key, no content. */
function LegsGate({ will }: { will: WillServices }) {
  const { state } = useSession();
  if (state.status !== "unlocked") return <Gate />;
  return (
    <WillWorkspaceProvider {...will}>
      <WillRoutes />
    </WillWorkspaceProvider>
  );
}

function Gate() {
  const session = useSession();
  const { t } = useTranslation();
  const [started, setStarted] = useState(false);
  const { state } = session;

  switch (state.status) {
    case "loading":
      return <p role="status">{t("app.loading")}</p>;
    case "no-profile":
      return started ? (
        <CreateProfileScreen onCreate={session.create} />
      ) : (
        <WelcomeScreen onStart={() => setStarted(true)} />
      );
    case "locked":
      return <UnlockScreen profiles={session.profiles} onUnlock={session.unlock} />;
    case "unlocked":
      return <HomeScreen firstName={state.profile.firstName} onLock={session.lock} />;
  }
}

export function App({ update, will }: { update: UpdateHandle | null; will: WillServices }) {
  const session = useSession();
  const { t } = useTranslation();
  useAutoLock(session.state.status === "unlocked", session.lock);

  return (
    <>
      <a className="app-skip" href="#main">
        {t("app.skipToContent")}
      </a>
      <EvaluationBanner />
      <AppHeader />
      {update ? (
        <Alert tone="info" role="status">
          {t("update.available")}{" "}
          <Button variant="secondary" onClick={update.apply}>
            {t("update.apply")}
          </Button>
        </Alert>
      ) : null}
      <main id="main" className="app-main" tabIndex={-1}>
        <Routes>
          <Route
            path="/donnees"
            element={
              <DataLocationScreen
                storage={session.storage}
                onDeleteEverything={session.deleteEverything}
              />
            }
          />
          <Route path="/legs/*" element={<LegsGate will={will} />} />
          <Route path="*" element={<Gate />} />
        </Routes>
      </main>
    </>
  );
}
