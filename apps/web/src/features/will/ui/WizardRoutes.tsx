import {
  assessPhysicalWillRecord,
  assessWillDraft,
  assessWishesDocument,
  type PhysicalWillRecord,
  type WillDraft,
  type WishesDocument,
} from "@veille/core/will";
import { useNavigate, useParams } from "react-router";
import { draftSteps } from "../domain/draft-steps";
import { recordSteps } from "../domain/record-steps";
import { resumeStepId, type ObjectKey } from "../domain/status";
import { wishesSteps } from "../domain/wishes-steps";
import { LEGS, REVIEW, stepPath } from "./paths";
import { WizardScreen } from "./WizardScreen";
import { useWill } from "./WillWorkspace";

function useStepId(): string | null {
  const { step } = useParams();
  return step ? decodeURIComponent(step) : null;
}

function Flow<T>({
  docKey,
  steps,
  doc,
}: {
  docKey: ObjectKey;
  steps: Parameters<typeof WizardScreen<T>>[0]["steps"];
  doc: T;
}) {
  const will = useWill();
  const navigate = useNavigate();
  const stepId = useStepId();
  return (
    <WizardScreen<T>
      steps={steps}
      doc={doc}
      stepId={stepId}
      newId={will.newId}
      onEdit={(edit) => will.update(docKey, edit as never)}
      goTo={(id) => void navigate(stepPath(docKey, id))}
      onExit={() => void navigate(LEGS)}
      onFinish={() => {
        // Finishing a part keeps an immutable version of it, then shows the checklist.
        void will.commit(docKey).then(() => navigate(REVIEW));
      }}
    />
  );
}

export function DraftWizard() {
  const { state } = useWill();
  if (state.status !== "ready") return null;
  const doc = state.workspace.draft as WillDraft;
  return <Flow<WillDraft> docKey="draft" steps={draftSteps(doc)} doc={doc} />;
}

export function WishesWizard() {
  const { state } = useWill();
  if (state.status !== "ready") return null;
  const doc = state.workspace.wishes as WishesDocument;
  return <Flow<WishesDocument> docKey="wishes" steps={wishesSteps(doc)} doc={doc} />;
}

export function RecordWizard() {
  const { state } = useWill();
  if (state.status !== "ready") return null;
  const doc = state.workspace.physicalRecord as PhysicalWillRecord;
  return <Flow<PhysicalWillRecord> docKey="physicalRecord" steps={recordSteps(doc)} doc={doc} />;
}

/** Where "Continuer" on the hub should land for each object. */
export function resumeTargets(ws: {
  draft: WillDraft;
  wishes: WishesDocument;
  physicalRecord: PhysicalWillRecord;
}): Record<ObjectKey, string> {
  return {
    draft: stepPath("draft", resumeStepId(draftSteps(ws.draft), assessWillDraft(ws.draft))),
    wishes: stepPath(
      "wishes",
      resumeStepId(wishesSteps(ws.wishes), assessWishesDocument(ws.wishes)),
    ),
    physicalRecord: stepPath(
      "physicalRecord",
      resumeStepId(recordSteps(ws.physicalRecord), assessPhysicalWillRecord(ws.physicalRecord)),
    ),
  };
}
