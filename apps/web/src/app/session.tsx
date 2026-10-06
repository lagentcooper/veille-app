import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ProfileService, UnlockResult } from "../features/profile/data/profile-service";
import type { Profile } from "../features/profile/domain/profile";
import type { StorageProvider } from "@veille/core/ports";

export type SessionState =
  | { status: "loading" }
  | { status: "no-profile" }
  | { status: "locked" }
  | { status: "unlocked"; profile: Profile };

export interface Session {
  state: SessionState;
  profiles: ProfileService;
  storage: StorageProvider;
  create(input: { firstName: string; code: string }): Promise<boolean>;
  unlock(code: string): Promise<UnlockResult>;
  lock(): void;
  deleteEverything(): Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({
  profiles,
  storage,
  children,
}: {
  profiles: ProfileService;
  storage: StorageProvider;
  children: ReactNode;
}) {
  const [state, setState] = useState<SessionState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void profiles.exists().then((exists) => {
      if (!cancelled) setState(exists ? { status: "locked" } : { status: "no-profile" });
    });
    return () => {
      cancelled = true;
    };
  }, [profiles]);

  const create = useCallback(
    async (input: { firstName: string; code: string }) => {
      const result = await profiles.create(input);
      if (result.status === "created") setState({ status: "unlocked", profile: result.profile });
      return result.status === "created";
    },
    [profiles],
  );
  const unlock = useCallback(
    async (code: string) => {
      const result = await profiles.unlock(code);
      if (result.status === "unlocked") setState({ status: "unlocked", profile: result.profile });
      return result;
    },
    [profiles],
  );
  const lock = useCallback(() => {
    profiles.lock();
    setState((current) => (current.status === "unlocked" ? { status: "locked" } : current));
  }, [profiles]);
  const deleteEverything = useCallback(async () => {
    await profiles.deleteEverything();
    setState({ status: "no-profile" });
  }, [profiles]);

  const value = useMemo<Session>(
    () => ({ state, profiles, storage, create, unlock, lock, deleteEverything }),
    [state, profiles, storage, create, unlock, lock, deleteEverything],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession outside SessionProvider");
  return session;
}
