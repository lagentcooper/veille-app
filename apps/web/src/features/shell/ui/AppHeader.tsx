import { useTranslation } from "react-i18next";
import { Logo } from "./Logo";

export function AppHeader() {
  const { t } = useTranslation();
  return (
    <header className="app-header">
      <div className="app-header__inner">
        <Logo className="app-header__logo" />
        <span className="app-header__name">{t("app.name")}</span>
      </div>
    </header>
  );
}
