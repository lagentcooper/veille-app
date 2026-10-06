import { Callout } from "@veille/ui";
import { useTranslation } from "react-i18next";

/**
 * "Legs, testament : quelle différence ?" — a documentation insert shown on the hub.
 * ⚖️ VALIDATION JURIDIQUE REQUISE: the wording lives in `will-fr.ts` (`will.explainer.*`).
 */
/** Open on a first visit (nothing started yet), folded afterwards so the cards stay in view. */
export function Explainer({ defaultOpen = true }: { defaultOpen?: boolean }) {
  const { t } = useTranslation();
  const terms = ["testament", "legacy", "wishes"] as const;
  const forms = ["handwritten", "authentic", "mystic"] as const;
  const here = ["draft", "wishes", "record"] as const;
  return (
    <Callout
      title={t("will.explainer.title")}
      icon="book"
      defaultOpen={defaultOpen}
      className="will-explainer"
    >
      <p>{t("will.explainer.intro")}</p>
      <dl className="will-explainer__terms">
        {terms.map((k) => (
          <div key={k}>
            <dt>{t(`will.explainer.${k}.term`)}</dt>
            <dd>{t(`will.explainer.${k}.text`)}</dd>
          </div>
        ))}
      </dl>
      <h2 className="will-explainer__sub">{t("will.explainer.forms.title")}</h2>
      <p>{t("will.explainer.forms.intro")}</p>
      <dl className="will-explainer__terms">
        {forms.map((k) => (
          <div key={k}>
            <dt>{t(`will.explainer.forms.${k}.term`)}</dt>
            <dd>{t(`will.explainer.forms.${k}.text`)}</dd>
          </div>
        ))}
      </dl>
      <p>{t("will.explainer.forms.notaryOptional")}</p>
      <h2 className="will-explainer__sub">{t("will.explainer.inVeille.title")}</h2>
      <ul className="will-explainer__here">
        {here.map((k) => (
          <li key={k}>{t(`will.explainer.inVeille.${k}`)}</li>
        ))}
      </ul>
      <p>{t("will.explainer.law")}</p>
      <p className="will-explainer__footnote">{t("will.explainer.footnote")}</p>
    </Callout>
  );
}
