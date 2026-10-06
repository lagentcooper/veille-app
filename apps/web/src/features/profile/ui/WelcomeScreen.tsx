import { Button, Icon, type IconName } from "@veille/ui";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

const POINTS: ReadonlyArray<{ icon: IconName; key: "local" | "guided" | "notLawyer" }> = [
  { icon: "lock", key: "local" },
  { icon: "pen", key: "guided" },
  { icon: "shield", key: "notLawyer" },
];

export function WelcomeScreen({ onStart }: { onStart: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="v-stack">
      <h1>{t("welcome.title")}</h1>
      <p className="app-lead">{t("welcome.intro")}</p>
      <ul className="app-points">
        {POINTS.map(({ icon, key }) => (
          <li key={key}>
            <span className="app-points__icon">
              <Icon name={icon} />
            </span>
            <span>{t(`welcome.${key}`)}</span>
          </li>
        ))}
      </ul>
      <Button block onClick={onStart}>
        {t("welcome.start")}
        <Icon name="arrow-right" />
      </Button>
      <Link to="/donnees">{t("welcome.whereData")}</Link>
    </div>
  );
}
