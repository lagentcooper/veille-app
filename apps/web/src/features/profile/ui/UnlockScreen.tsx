import { Alert, Button, TextField } from "@veille/ui";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { ProfileService, UnlockResult } from "../data/profile-service";
import { useFocusHeading } from "../../../app/use-focus-heading";
import { toDuration } from "../../shell/domain/format";

export function UnlockScreen({
  profiles,
  onUnlock,
}: {
  profiles: ProfileService;
  onUnlock: (code: string) => Promise<UnlockResult>;
}) {
  const { t } = useTranslation();
  const heading = useFocusHeading(null);
  const [code, setCode] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [retryAt, setRetryAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    void profiles.lockout().then((status) => {
      if (status?.locked) setRetryAt(Date.now() + status.retryAfterMs);
    });
  }, [profiles]);

  useEffect(() => {
    if (retryAt === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [retryAt]);

  const waitMs = retryAt === null ? 0 : Math.max(0, retryAt - now);
  const lockedOut = waitMs > 0;
  const duration = toDuration(waitMs);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (lockedOut) return;
    setWorking(true);
    setMessage(null);
    const result = await onUnlock(code);
    setWorking(false);
    setCode("");
    if (result.status === "wrong-code")
      setMessage(t("unlock.wrong", { count: result.attemptsLeft }));
    if (result.status === "locked-out") {
      setNow(Date.now());
      setRetryAt(Date.now() + result.retryAfterMs);
      setMessage(null);
    }
  };

  return (
    <form className="v-stack" onSubmit={(e) => void submit(e)} noValidate>
      <h1 ref={heading} tabIndex={-1}>
        {t("unlock.title")}
      </h1>
      {lockedOut ? (
        <Alert tone="warning" role="status">
          {t("unlock.lockedOut", {
            time: t(`duration.${duration.unit}`, { count: duration.count }),
          })}
        </Alert>
      ) : null}
      <TextField
        code
        label={t("unlock.label")}
        error={message}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        maxLength={6}
        disabled={working || lockedOut}
      />
      {working ? <p role="status">{t("unlock.working")}</p> : null}
      <Button type="submit" block disabled={working || lockedOut || code.length === 0}>
        {t("unlock.submit")}
      </Button>
      <details>
        <summary>{t("unlock.forgot")}</summary>
        <p>{t("unlock.forgotBody")}</p>
      </details>
      <Link to="/donnees">{t("welcome.whereData")}</Link>
    </form>
  );
}
