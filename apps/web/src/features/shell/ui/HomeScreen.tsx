import { Alert, Button, Card } from "@veille/ui";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

export function HomeScreen({ firstName, onLock }: { firstName: string; onLock: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="v-stack">
      <h1>{t("home.title", { name: firstName })}</h1>
      <Alert tone="success">{t("home.ready")}</Alert>
      <Card aria-labelledby="home-legs">
        <h2 id="home-legs">{t("home.legs")}</h2>
        <p>{t("home.legsBody")}</p>
        <Link className="v-button" to="/legs">
          {t("home.legsOpen")}
        </Link>
      </Card>
      <Card aria-label={t("home.soon")}>
        <p>{t("home.soon")}</p>
        <p>{t("home.autoLock")}</p>
      </Card>
      <Link to="/donnees">{t("home.whereData")}</Link>
      <Button variant="secondary" block onClick={onLock}>
        {t("home.lock")}
      </Button>
    </div>
  );
}
