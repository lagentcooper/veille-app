import { Route, Routes } from "react-router";
import { ExportScreen } from "./ExportScreen";
import { HistoryScreen } from "./HistoryScreen";
import { HubScreen } from "./HubScreen";
import { ReviewScreen } from "./ReviewScreen";
import { WillLayout } from "./WillLayout";
import { DraftWizard, RecordWizard, WishesWizard } from "./WizardRoutes";

/** Everything under /legs. The permanent disclaimer lives in the layout. */
export function WillRoutes() {
  return (
    <Routes>
      <Route element={<WillLayout />}>
        <Route index element={<HubScreen />} />
        <Route path="brouillon/:step?" element={<DraftWizard />} />
        <Route path="volontes/:step?" element={<WishesWizard />} />
        <Route path="testament-manuscrit/:step?" element={<RecordWizard />} />
        <Route path="synthese" element={<ReviewScreen />} />
        <Route path="pdf" element={<ExportScreen />} />
        <Route path="historique" element={<HistoryScreen />} />
      </Route>
    </Routes>
  );
}
