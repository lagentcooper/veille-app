import { canonicalJson } from "./canonical";
import type { WillHasher } from "./environment";
import type { PhysicalWillRecord, WillDraft, WillSubject, WishesDocument } from "./model";
import { WILL_SUBJECTS } from "./model";
import { parseVeaWillState, parseWillVersion, type ParseIssue } from "./parse";
import { buildWillJsonSchema } from "./vea-schema";
import {
  verifyHistory,
  type VersionHistory,
  type VersionIssue,
  type WillVersion,
} from "./versions";

/**
 * Will part of the Veille Export Archive (ADR-0006, `docs/privacy/02-export-portabilite-suppression.md`).
 *
 * This module only produces and reads the will's files; the ZIP, the manifest and its hashes belong
 * to `packages/core/src/export`. Paths are relative to the archive root:
 *
 *   schemas/will.schema.json
 *   data/will/will.json                      current state of the three objects
 *   data/will/versions/<subject>-<NNNN>.json complete history, one file per version
 *
 * ⚖️ The PDF renderings (`rendered/`) are produced by the app (Session C), not here.
 */

export interface WillWorkspace {
  draft: WillDraft;
  wishes: WishesDocument;
  physicalRecord: PhysicalWillRecord;
  histories: {
    draft: VersionHistory<WillDraft>;
    wishes: VersionHistory<WishesDocument>;
    physicalRecord: VersionHistory<PhysicalWillRecord>;
  };
}

export interface VeaFile {
  path: string;
  content: string;
}

export const VEA_WILL_STATE_PATH = "data/will/will.json";
export const VEA_WILL_SCHEMA_PATH = "schemas/will.schema.json";
const VERSION_PATH = new RegExp(
  `^data/will/versions/(${WILL_SUBJECTS.join("|")})-(\\d{4,})\\.json$`,
);

const pad = (n: number): string => String(n).padStart(4, "0");
const versionPath = (subject: WillSubject, sequence: number): string =>
  `data/will/versions/${subject}-${pad(sequence)}.json`;

export function serializeWillToVea(ws: WillWorkspace): VeaFile[] {
  const files: VeaFile[] = [
    { path: VEA_WILL_SCHEMA_PATH, content: canonicalJson(buildWillJsonSchema(), 2) },
    {
      path: VEA_WILL_STATE_PATH,
      content: canonicalJson(
        {
          veaEntity: "will",
          schemaVersion: ws.draft.schemaVersion,
          draft: ws.draft,
          wishes: ws.wishes,
          physicalRecord: ws.physicalRecord,
        },
        2,
      ),
    },
  ];
  for (const history of [ws.histories.draft, ws.histories.wishes, ws.histories.physicalRecord]) {
    for (const v of history.versions) {
      files.push({ path: versionPath(v.subject, v.sequence), content: canonicalJson(v, 2) });
    }
  }
  return files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

export type VeaReadError =
  | { code: "missing-file"; path: string }
  | { code: "invalid-json"; path: string }
  | { code: "invalid-content"; path: string; issues: ParseIssue[] }
  | { code: "path-mismatch"; path: string }
  | { code: "altered-history"; subject: WillSubject; issues: VersionIssue[] };

export type VeaReadResult =
  { ok: true; workspace: WillWorkspace } | { ok: false; errors: VeaReadError[] };

function parseJson(file: VeaFile): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(file.content) as unknown };
  } catch {
    return { ok: false };
  }
}

/**
 * All-or-nothing: any malformed file or broken hash chain rejects the whole will (an archive is never
 * imported partially, ADR-0006). Unrelated files in `files` are ignored.
 */
export async function deserializeWillFromVea(
  files: readonly VeaFile[],
  hasher: WillHasher,
): Promise<VeaReadResult> {
  const errors: VeaReadError[] = [];
  const stateFile = files.find((f) => f.path === VEA_WILL_STATE_PATH);
  if (!stateFile)
    return { ok: false, errors: [{ code: "missing-file", path: VEA_WILL_STATE_PATH }] };

  const rawState = parseJson(stateFile);
  if (!rawState.ok) return { ok: false, errors: [{ code: "invalid-json", path: stateFile.path }] };
  const state = parseVeaWillState(rawState.value);
  if (!state.ok)
    return {
      ok: false,
      errors: [{ code: "invalid-content", path: stateFile.path, issues: state.issues }],
    };

  const bySubject: Record<WillSubject, WillVersion[]> = {
    "will-draft": [],
    "wishes-document": [],
    "physical-will-record": [],
  };
  for (const file of files) {
    const match = VERSION_PATH.exec(file.path);
    if (!match) continue;
    const raw = parseJson(file);
    if (!raw.ok) {
      errors.push({ code: "invalid-json", path: file.path });
      continue;
    }
    const parsed = parseWillVersion(raw.value);
    if (!parsed.ok) {
      errors.push({ code: "invalid-content", path: file.path, issues: parsed.issues });
      continue;
    }
    if (parsed.value.subject !== match[1] || parsed.value.sequence !== Number(match[2])) {
      errors.push({ code: "path-mismatch", path: file.path });
      continue;
    }
    bySubject[parsed.value.subject].push(parsed.value);
  }

  const histories = {} as Record<WillSubject, VersionHistory>;
  for (const subject of WILL_SUBJECTS) {
    const versions = bySubject[subject].sort((a, b) => a.sequence - b.sequence);
    const history: VersionHistory = { subject, versions };
    const issues = await verifyHistory(history, hasher);
    if (issues.length > 0) errors.push({ code: "altered-history", subject, issues });
    histories[subject] = history;
  }
  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    workspace: {
      draft: state.value.draft,
      wishes: state.value.wishes,
      physicalRecord: state.value.physicalRecord,
      histories: {
        draft: histories["will-draft"] as VersionHistory<WillDraft>,
        wishes: histories["wishes-document"] as VersionHistory<WishesDocument>,
        physicalRecord: histories["physical-will-record"] as VersionHistory<PhysicalWillRecord>,
      },
    },
  };
}
