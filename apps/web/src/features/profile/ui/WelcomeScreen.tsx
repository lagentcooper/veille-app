import { Button, Card } from "@veille/ui";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

export function WelcomeScreen({ onStart }: { onStart: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="v-stack">
      <h1>{t("welcome.title")}</h1>
      <p>{t("welcome.intro")}</p>
      <Card aria-label={t("welcome.local")}>
        <p>{t("welcome.local")}</p>
        <p>{t("welcome.notLawyer")}</p>
      </Card>
      <Button block onClick={onStart}>
        {t("welcome.start")}
      </Button>
      <Link to="/donnees">{t("welcome.whereData")}</Link>
    </div>
  );
}
