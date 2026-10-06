import { Alert, Button } from "@veille/ui";
import { useTranslation } from "react-i18next";
import { Link, Outlet, useLocation } from "react-router";
import { LEGS } from "./paths";
import { useSession } from "../../../app/session";
import { useWill } from "./WillWorkspace";

/**
 * Permanent, non-dismissible notice (ADR-0008, §2.7.3): there is no close button, no "don't show
 * again", and it is rendered by the layout so no screen of the journey can forget it.
 */
export function WillDisclaimer() {
  const { t } = useTranslation();
  return (
    <Alert
      tone="warning"
      role="region"
      aria-label={t("will.disclaimer.region")}
      data-testid="will-disclaimer"
    >
      <p className="will-disclaimer">
        {t("will.disclaimer.notLegalAdvice")} {t("will.disclaimer.handwrittenFormRequired")}{" "}
        {t("will.disclaimer.consultNotary")}
      </p>
    </Alert>
  );
}

function SaveIndicator() {
  const { t, i18n } = useTranslation();
  const { save } = useWill();
  if (save.status === "idle") return null;
  if (save.status === "error")
    return (
      <Alert tone="danger" role="alert">
        {t("will.save.error")}
      </Alert>
    );
  const text =
    save.status === "saving"
      ? t("will.save.saving")
      : t("will.save.saved", {
          time: new Intl.DateTimeFormat(i18n.language, { timeStyle: "short" }).format(save.at),
        });
  return (
    <p role="status" className="will-save">
      {text}
    </p>
  );
}

export function WillLayout() {
  const { t } = useTranslation();
  const { state } = useWill();
  const { pathname } = useLocation();
  const session = useSession();
  return (
    <div className="v-stack">
      <WillDisclaimer />
      {pathname.replace(/\/$/, "") !== LEGS ? <Link to={LEGS}>{t("will.nav.back")}</Link> : null}
      {state.status === "loading" ? <p role="status">{t("will.error.loading")}</p> : null}
      {state.status === "unreadable" ? (
        <Alert tone="danger" title={t("will.error.unreadableTitle")}>
          {t("will.error.unreadable")} <Link to="/donnees">{t("home.whereData")}</Link>
        </Alert>
      ) : null}
      {state.status === "ready" ? (
        <>
          <SaveIndicator />
          <Outlet />
        </>
      ) : null}
      <Button variant="secondary" block onClick={session.lock}>
        {t("home.lock")}
      </Button>
    </div>
  );
}
