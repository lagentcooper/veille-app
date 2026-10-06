import type { Finding } from "@veille/core/will";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

/** Findings in plain language. `fixPath` resolves the screen where the user can act on one. */
export function FindingsList({
  findings,
  fixPath,
}: {
  findings: readonly Finding[];
  fixPath: (finding: Finding) => string | null;
}) {
  const { t } = useTranslation();
  const text = (f: Finding) =>
    f.kind === "blocking"
      ? t(f.messageKey, { context: String(f.params?.["trigger"] ?? "") })
      : t(f.messageKey);
  return (
    <ul className="will-findings">
      {findings.map((f, i) => {
        const to = fixPath(f);
        return (
          <li key={`${f.code}:${f.field ?? ""}:${i}`} data-kind={f.kind}>
            <span aria-hidden="true">{f.kind === "blocking" ? "🛑" : "⚠️"}</span> {text(f)}{" "}
            {to ? (
              <Link to={to}>
                {f.kind === "blocking" ? t("will.finding.change") : t("will.finding.fix")}
              </Link>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
