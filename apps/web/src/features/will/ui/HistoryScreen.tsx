import { Card } from "@veille/ui";
import type { WillSubject, WillVersion } from "@veille/core/will";
import { useTranslation } from "react-i18next";
import { useFocusHeading } from "../../../app/use-focus-heading";
import { summarize } from "../domain/summary";
import { useWill } from "./WillWorkspace";

const OBJECTS = [
  { key: "draft", subject: "will-draft", i18n: "draft" },
  { key: "wishes", subject: "wishes-document", i18n: "wishes" },
  { key: "physicalRecord", subject: "physical-will-record", i18n: "record" },
] as const;

function VersionItem({ version, subject }: { version: WillVersion; subject: WillSubject }) {
  const { t, i18n } = useTranslation();
  const date = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(version.createdAt));
  const lines = summarize(subject, version.snapshot);
  const value = (label: string, v: string) =>
    label === "existence"
      ? t(
          v === "yes"
            ? "will.history.summary.existsYes"
            : v === "no"
              ? "will.history.summary.existsNo"
              : "will.history.summary.existsUnknown",
        )
      : v;
  return (
    <li>
      <details>
        <summary>
          {t("will.history.version", { n: version.sequence, date })}
          <span className="v-visually-hidden"> — {t("will.history.show")}</span>
        </summary>
        <p>{t("will.history.fingerprint", { value: version.hash.slice(0, 12) })}</p>
        <dl>
          {lines.map((line) => (
            <div key={line.label}>
              <dt>{t(`will.history.summary.${line.label}`)}</dt>
              <dd>
                {line.values.length === 0 || line.values.every((v) => v.trim() === "")
                  ? t("will.history.summary.none")
                  : line.values.map((v, i) => <div key={i}>{value(line.label, v)}</div>)}
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </li>
  );
}

/** Read-only: versions are immutable and never deleted from here. */
export function HistoryScreen() {
  const { t } = useTranslation();
  const { state } = useWill();
  const heading = useFocusHeading(null);
  if (state.status !== "ready") return null;
  const histories = state.workspace.histories;
  const total = OBJECTS.reduce((n, o) => n + histories[o.key].versions.length, 0);

  return (
    <div className="v-stack">
      <h1 ref={heading} tabIndex={-1}>
        {t("will.history.title")}
      </h1>
      <p>{t("will.history.intro")}</p>
      <p>{t("will.history.integrity")}</p>
      {total === 0 ? <p>{t("will.history.empty")}</p> : null}
      {OBJECTS.map((o) => {
        const versions = [...histories[o.key].versions].reverse();
        if (versions.length === 0) return null;
        return (
          <Card key={o.key} aria-labelledby={`history-${o.key}`}>
            <h2 id={`history-${o.key}`}>{t(`will.history.objects.${o.i18n}`)}</h2>
            <ul className="will-versions">
              {versions.map((v) => (
                <VersionItem key={v.hash} version={v} subject={o.subject} />
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
