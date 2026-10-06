import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { fr } from "./fr";

export async function initI18n(): Promise<typeof i18next> {
  await i18next.use(initReactI18next).init({
    showSupportNotice: false,
    lng: "fr",
    fallbackLng: "fr",
    resources: { fr: { translation: fr } },
    interpolation: { escapeValue: false },
    returnObjects: true,
  });
  return i18next;
}
