import type { Clock } from "@veille/core/ports";
import {
  appendVersion,
  assessPhysicalWillRecord,
  assessWillDraft,
  assessWishesDocument,
  type Assessment,
  type PhysicalWillRecord,
  type VersionHistory,
  type WillDraft,
  type WillEnvironment,
  type WillSnapshot,
  type WillSubject,
  type WillWorkspace as Workspace,
  type WishesDocument,
} from "@veille/core/will";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { WillRepository, WillUnreadableError } from "../data/will-repository";

export type SaveState =
  { status: "idle" } | { status: "saving" } | { status: "saved"; at: number } | { status: "error" };

export type WorkspaceState =
  { status: "loading" } | { status: "unreadable" } | { status: "ready"; workspace: Workspace };

export interface WillApi {
  state: WorkspaceState;
  save: SaveState;
  /** Applies an edit and saves it right away (autosave, no "Save" button to forget). */
  update<K extends EditableKey>(key: K, edit: (doc: Workspace[K]) => Workspace[K]): void;
  /** Records an immutable version of the current state of one object. */
  commit(key: EditableKey): Promise<void>;
  /** Fresh identifiers for new list items; kept out of the domain on purpose. */
  newId(): string;
}

export type EditableKey = "draft" | "wishes" | "physicalRecord";

const SUBJECT_OF: Record<EditableKey, WillSubject> = {
  draft: "will-draft",
  wishes: "wishes-document",
  physicalRecord: "physical-will-record",
};

const WillContext = createContext<WillApi | null>(null);

export interface WillServices {
  repository: WillRepository;
  env: WillEnvironment;
  clock: Clock;
}

export function WillWorkspaceProvider({
  repository,
  env,
  clock,
  children,
}: WillServices & { children: ReactNode }) {
  const [state, setState] = useState<WorkspaceState>({ status: "loading" });
  const [save, setSave] = useState<SaveState>({ status: "idle" });
  const ref = useRef<Workspace | null>(null);
  const dirty = useRef(new Set<EditableKey>());
  const running = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    void repository
      .load()
      .then((workspace) => {
        if (!mounted.current) return;
        ref.current = workspace;
        setState({ status: "ready", workspace });
      })
      .catch((error: unknown) => {
        if (mounted.current && error instanceof WillUnreadableError)
          setState({ status: "unreadable" });
      });
    return () => {
      mounted.current = false;
    };
  }, [repository]);

  const persist = useCallback(
    async (key: EditableKey) => {
      const ws = ref.current;
      if (!ws) return;
      const subject = SUBJECT_OF[key];
      const history = ws.histories[key] as VersionHistory<WillSnapshot>;
      await repository.save(subject, { current: ws[key] as WillSnapshot, history });
    },
    [repository],
  );

  // One writer at a time; edits made while a write is running are saved right after it.
  const drain = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      while (dirty.current.size > 0) {
        const key = dirty.current.values().next().value as EditableKey;
        dirty.current.delete(key);
        if (mounted.current) setSave({ status: "saving" });
        try {
          await persist(key);
          if (mounted.current) setSave({ status: "saved", at: clock.now() });
        } catch {
          if (mounted.current) setSave({ status: "error" });
        }
      }
    } finally {
      running.current = false;
    }
  }, [persist, clock]);

  const update = useCallback<WillApi["update"]>(
    (key, edit) => {
      const ws = ref.current;
      if (!ws) return;
      const next = { ...ws, [key]: edit(ws[key]) } as Workspace;
      ref.current = next;
      setState({ status: "ready", workspace: next });
      dirty.current.add(key);
      void drain();
    },
    [drain],
  );

  const commit = useCallback<WillApi["commit"]>(
    async (key) => {
      const ws = ref.current;
      if (!ws) return;
      const history = ws.histories[key] as VersionHistory<WillSnapshot>;
      const result = await appendVersion(history, ws[key] as WillSnapshot, env);
      if (!result.created) return;
      const latest = ref.current ?? ws;
      const next = {
        ...latest,
        histories: { ...latest.histories, [key]: result.history },
      } as Workspace;
      ref.current = next;
      setState({ status: "ready", workspace: next });
      dirty.current.add(key);
      await drain();
    },
    [env, drain],
  );

  const api = useMemo<WillApi>(
    () => ({ state, save, update, commit, newId: () => crypto.randomUUID() }),
    [state, save, update, commit],
  );
  return <WillContext.Provider value={api}>{children}</WillContext.Provider>;
}

export function useWill(): WillApi {
  const api = useContext(WillContext);
  if (!api) throw new Error("useWill outside WillWorkspaceProvider");
  return api;
}

export interface Assessments {
  draft: Assessment;
  wishes: Assessment;
  record: Assessment;
}

export function assessWorkspace(ws: Workspace): Assessments {
  return {
    draft: assessWillDraft(ws.draft as WillDraft),
    wishes: assessWishesDocument(ws.wishes as WishesDocument),
    record: assessPhysicalWillRecord(ws.physicalRecord as PhysicalWillRecord),
  };
}
