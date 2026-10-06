import { Alert, Button, Card, ConfirmDialog } from "@veille/ui";
import type { PersistenceState, StorageProvider, StorageUsage } from "@veille/core/ports";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { toMegabytes } from "../domain/format";

export function DataLocationScreen({
  storage,
  onDeleteEverything,
}: {
  storage: StorageProvider;
  onDeleteEverything: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [persistence, setPersistence] = useState<PersistenceState | "unknown">("unknown");
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [requested, setRequested] = useState<"granted" | "denied" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    void storage.persistence().then(setPersistence);
    void storage.usage().then(setUsage);
  }, [storage]);

  const request = async () => {
    const state = await storage.requestPersistence();
    setPersistence(state);
    setRequested(state === "persisted" ? "granted" : "denied");
  };
  const remove = async () => {
    setConfirming(false);
    await onDeleteEverything();
    setDeleted(true);
    setPersistence(await storage.persistence());
    setUsage(await storage.usage());
  };

  const mb = (bytes: number | null) =>
    bytes === null ? t("size.unknown") : t("size.mb", { value: toMegabytes(bytes) });
  const items = t("data.notDone.items", { returnObjects: true }) as unknown as string[];

  return (
    <div className="v-stack">
      <Link to="/">{t("data.back")}</Link>
      <h1>{t("data.title")}</h1>
      <Card aria-labelledby="data-device">
        <h2 id="data-device">{t("data.onDevice.title")}</h2>
        <p>{t("data.onDevice.body")}</p>
      </Card>
      <Card aria-labelledby="data-not">
        <h2 id="data-not">{t("data.notDone.title")}</h2>
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Card>
      <Card aria-labelledby="data-persist">
        <h2 id="data-persist">{t("data.persistence.title")}</h2>
        <p data-testid="persistence-state" data-state={persistence}>
          {t(`data.persistence.${persistence}`)}
        </p>
        {persistence === "best-effort" ? (
          <Button variant="secondary" onClick={() => void request()}>
            {t("data.persistence.request")}
          </Button>
        ) : null}
        {requested ? <p role="status">{t(`data.persistence.${requested}`)}</p> : null}
        <h3>{t("data.usage.title")}</h3>
        <p>
          {t("data.usage.value", {
            used: mb(usage?.usedBytes ?? null),
            quota: mb(usage?.quotaBytes ?? null),
          })}
        </p>
      </Card>
      <Alert tone="warning" title={t("data.evaluation.title")}>
        {t("data.evaluation.body")}
      </Alert>
      {deleted ? (
        <Alert tone="success" role="status">
          {t("data.delete.done")}
        </Alert>
      ) : null}
      <Button variant="danger" onClick={() => setConfirming(true)}>
        {t("data.delete.button")}
      </Button>
      <ConfirmDialog
        open={confirming}
        title={t("data.delete.title")}
        confirmLabel={t("data.delete.confirm")}
        cancelLabel={t("data.delete.cancel")}
        danger
        onConfirm={() => void remove()}
        onCancel={() => setConfirming(false)}
      >
        <p>{t("data.delete.body")}</p>
      </ConfirmDialog>
    </div>
  );
}
