import { Alert, Button, Card } from "@veille/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useFocusHeading } from "../../../app/use-focus-heading";
import { downloadFile } from "../data/download";
import {
  composeHandwritingPdf,
  composeWishesPdf,
  DRAFT_PDF_FILENAME,
  WISHES_PDF_FILENAME,
  type Translate,
} from "../domain/documents";
import { renderPdf } from "../domain/pdf";
import { statusOf } from "../domain/status";
import { REVIEW } from "./paths";
import { assessWorkspace, useWill } from "./WillWorkspace";

type Which = "draft" | "wishes";

/**
 * Two documents, two files, never merged (ADR-0008): the text to copy by hand, and the wishes.
 * The first one is not offered while a professional is required or something is missing.
 */
export function ExportScreen() {
  const { t } = useTranslation();
  const { state, commit } = useWill();
  const heading = useFocusHeading(null);
  const [done, setDone] = useState<Which | null>(null);
  if (state.status !== "ready") return null;
  const ws = state.workspace;
  const a = assessWorkspace(ws);

  const translate: Translate = (key, params) => t(key, params ?? {});
  const generate = async (which: Which) => {
    // The exact state that was exported is kept in the history.
    await commit(which);
    const pdf =
      which === "draft"
        ? renderPdf(composeHandwritingPdf(ws.draft, translate))
        : renderPdf(composeWishesPdf(ws.wishes, translate));
    downloadFile(
      pdf,
      which === "draft" ? DRAFT_PDF_FILENAME : WISHES_PDF_FILENAME,
      "application/pdf",
    );
    setDone(which);
  };

  const cards: ReadonlyArray<{
    which: Which;
    status: ReturnType<typeof statusOf>;
    blocks: boolean;
  }> = [
    {
      which: "draft",
      status: statusOf("draft", ws.draft, a.draft),
      blocks: a.draft.blocksReviewStep,
    },
    {
      which: "wishes",
      status: statusOf("wishes", ws.wishes, a.wishes),
      blocks: a.wishes.blocksReviewStep,
    },
  ];

  return (
    <div className="v-stack">
      <h1 ref={heading} tabIndex={-1}>
        {t("will.export.title")}
      </h1>
      <p>{t("will.export.intro")}</p>
      <Alert tone="warning">{t("will.export.plaintextWarning")}</Alert>
      {cards.map(({ which, status, blocks }) => (
        <Card key={which} aria-labelledby={`export-${which}`}>
          <h2 id={`export-${which}`}>{t(`will.export.${which}.title`)}</h2>
          <p>{t(`will.export.${which}.body`)}</p>
          {status === "complete" ? (
            <Button block onClick={() => void generate(which)}>
              {t(`will.export.${which}.download`)}
            </Button>
          ) : (
            <>
              <p>{blocks ? t("will.export.blocked") : t("will.export.notAvailable")}</p>
              <Link to={REVIEW}>{t("will.export.seeReview")}</Link>
            </>
          )}
          {done === which ? (
            <Alert tone="success" role="status">
              {t("will.export.done")}
            </Alert>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
