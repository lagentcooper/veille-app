import {
  ANSWERS,
  BENEFICIARY_KINDS,
  LEGAL_PROTECTIONS,
  LIMITS,
  MARITAL_STATUSES,
  PROVISION_CLAUSES,
  WILL_EXISTENCES,
  WILL_LOCATION_KINDS,
  WILL_SCHEMA_VERSION,
  WILL_SUBJECTS,
  type PhysicalWillRecord,
  type WillDraft,
  type WillSnapshot,
  type WillSubject,
  type WishesDocument,
} from "./model";
import type { WillVersion } from "./versions";

/**
 * Input validation at the boundary (AGENTS.md §5.6): anything coming from a VEA archive or from
 * storage is `unknown` until it passes here. Strict: unknown properties are rejected, strings and
 * arrays are bounded. Issues carry a path and a code, never the offending value (privacy §6.3).
 */

export type ParseIssueCode =
  | "expected-object"
  | "expected-array"
  | "expected-string"
  | "expected-boolean"
  | "expected-integer"
  | "invalid-enum"
  | "invalid-format"
  | "too-long"
  | "too-many-items"
  | "missing-property"
  | "unexpected-property"
  | "unsupported-schema-version";

export interface ParseIssue {
  path: string;
  code: ParseIssueCode;
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; issues: ParseIssue[] };

const INVALID: unique symbol = Symbol("invalid");
type Invalid = typeof INVALID;
type Parser<T> = (value: unknown, path: string, issues: ParseIssue[]) => T | Invalid;

const fail = (issues: ParseIssue[], path: string, code: ParseIssueCode): Invalid => {
  issues.push({ path, code });
  return INVALID;
};

const str =
  (max: number): Parser<string> =>
  (v, path, issues) => {
    if (typeof v !== "string") return fail(issues, path, "expected-string");
    if (v.length > max) return fail(issues, path, "too-long");
    return v;
  };

const bool: Parser<boolean> = (v, path, issues) =>
  typeof v === "boolean" ? v : fail(issues, path, "expected-boolean");

const int: Parser<number> = (v, path, issues) =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0
    ? v
    : fail(issues, path, "expected-integer");

const oneOf =
  <T extends string>(values: readonly T[]): Parser<T> =>
  (v, path, issues) =>
    typeof v === "string" && (values as readonly string[]).includes(v)
      ? (v as T)
      : fail(issues, path, "invalid-enum");

const literal =
  <T extends string | number>(expected: T): Parser<T> =>
  (v, path, issues) =>
    v === expected ? expected : fail(issues, path, "unsupported-schema-version");

const literalString =
  <T extends string>(expected: T): Parser<T> =>
  (v, path, issues) =>
    v === expected ? expected : fail(issues, path, "invalid-enum");

const isoInstant: Parser<string> = (v, path, issues) => {
  const s = str(64)(v, path, issues);
  if (s === INVALID) return INVALID;
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?Z$/.test(s) &&
    !Number.isNaN(Date.parse(s))
    ? s
    : fail(issues, path, "invalid-format");
};

const hex64: Parser<string> = (v, path, issues) => {
  const s = str(64)(v, path, issues);
  if (s === INVALID) return INVALID;
  return /^[0-9a-f]{64}$/.test(s) ? s : fail(issues, path, "invalid-format");
};

const nullable =
  <T>(p: Parser<T>): Parser<T | null> =>
  (v, path, issues) =>
    v === null ? null : p(v, path, issues);

const arrayOf =
  <T>(item: Parser<T>, max: number = LIMITS.items): Parser<T[]> =>
  (v, path, issues) => {
    if (!Array.isArray(v)) return fail(issues, path, "expected-array");
    if (v.length > max) return fail(issues, path, "too-many-items");
    const out: T[] = [];
    let ok = true;
    v.forEach((x, i) => {
      const r = item(x, `${path}.${i}`, issues);
      if (r === INVALID) ok = false;
      else out.push(r);
    });
    return ok ? out : INVALID;
  };

type Shape<T> = { [K in keyof T]-?: Parser<T[K]> };

const object =
  <T extends object>(shape: Shape<T>): Parser<T> =>
  (v, path, issues) => {
    if (v === null || typeof v !== "object" || Array.isArray(v))
      return fail(issues, path, "expected-object");
    const record = v as Record<string, unknown>;
    let ok = true;
    for (const key of Object.keys(record)) {
      if (!(key in shape)) {
        issues.push({ path: join(path, key), code: "unexpected-property" });
        ok = false;
      }
    }
    const out: Record<string, unknown> = {};
    for (const [key, parser] of Object.entries(shape) as Array<[string, Parser<unknown>]>) {
      if (!(key in record)) {
        issues.push({ path: join(path, key), code: "missing-property" });
        ok = false;
        continue;
      }
      const r = parser(record[key], join(path, key), issues);
      if (r === INVALID) ok = false;
      else out[key] = r;
    }
    return ok ? (out as T) : INVALID;
  };

const join = (path: string, key: string): string => (path === "" ? key : `${path}.${key}`);

const answer = oneOf(ANSWERS);
const schemaVersion = literal(WILL_SCHEMA_VERSION);
const short = str(LIMITS.shortText);
const long = str(LIMITS.longText);

export const willDraftParser: Parser<WillDraft> = object<WillDraft>({
  schemaVersion,
  testatorFullName: short,
  situation: object({
    maritalStatus: oneOf(MARITAL_STATUSES),
    spousalDonation: answer,
    hasChildren: answer,
    hasMinorChildren: answer,
    blendedFamily: answer,
    lifeInsurance: answer,
    ownsRealEstate: answer,
    ownsBusinessInterests: answer,
    assetsAbroad: answer,
    residesOutsideFrance: answer,
    foreignNationality: answer,
    legalProtection: oneOf(LEGAL_PROTECTIONS),
  }),
  beneficiaries: arrayOf(
    object({ id: short, kind: oneOf(BENEFICIARY_KINDS), displayName: short, isMinor: answer }),
  ),
  provisions: arrayOf(
    object({ id: short, beneficiaryId: short, subject: long, clause: oneOf(PROVISION_CLAUSES) }),
  ),
  handwritingGuideAcknowledged: bool,
});

export const wishesDocumentParser: Parser<WishesDocument> = object<WishesDocument>({
  schemaVersion,
  funeralWishes: long,
  messages: arrayOf(object({ id: short, recipientLabel: short, text: long })),
  papers: arrayOf(object({ id: short, label: short, location: long })),
  hasBodyWishes: answer,
  bodyWishesNote: long,
});

export const physicalWillRecordParser: Parser<PhysicalWillRecord> = object<PhysicalWillRecord>({
  schemaVersion,
  existence: oneOf(WILL_EXISTENCES),
  locationKind: oneOf(WILL_LOCATION_KINDS),
  locationDetail: long,
  registeredInCentralFile: answer,
});

const SNAPSHOT_PARSERS: Record<WillSubject, Parser<WillSnapshot>> = {
  "will-draft": willDraftParser,
  "wishes-document": wishesDocumentParser,
  "physical-will-record": physicalWillRecordParser,
};

export const willVersionParser: Parser<WillVersion> = (v, path, issues) => {
  const header = object<Omit<WillVersion, "snapshot">>({
    schemaVersion,
    subject: oneOf(WILL_SUBJECTS),
    sequence: int,
    createdAt: isoInstant,
    hashAlgorithm: literal("sha-256" as const),
    previousHash: nullable(hex64),
    hash: hex64,
  });
  if (v === null || typeof v !== "object" || Array.isArray(v))
    return fail(issues, path, "expected-object");
  const { snapshot, ...rest } = v as Record<string, unknown>;
  const before = issues.length;
  // `snapshot` is the only key excluded from the header check; its absence is reported below.
  const parsedHeader = header(rest, path, issues);
  if (!("snapshot" in (v as object)))
    return fail(issues, join(path, "snapshot"), "missing-property");
  if (parsedHeader === INVALID) return INVALID;
  const parsedSnapshot = SNAPSHOT_PARSERS[parsedHeader.subject](
    snapshot,
    join(path, "snapshot"),
    issues,
  );
  if (parsedSnapshot === INVALID || issues.length > before) return INVALID;
  return { ...parsedHeader, snapshot: parsedSnapshot };
};

function run<T>(parser: Parser<T>, input: unknown): ParseResult<T> {
  const issues: ParseIssue[] = [];
  const value = parser(input, "", issues);
  return value === INVALID || issues.length > 0 ? { ok: false, issues } : { ok: true, value };
}

export const parseWillDraft = (input: unknown): ParseResult<WillDraft> =>
  run(willDraftParser, input);
export const parseWishesDocument = (input: unknown): ParseResult<WishesDocument> =>
  run(wishesDocumentParser, input);
export const parsePhysicalWillRecord = (input: unknown): ParseResult<PhysicalWillRecord> =>
  run(physicalWillRecordParser, input);
export const parseWillVersion = (input: unknown): ParseResult<WillVersion> =>
  run(willVersionParser, input);

/** Current state file of the archive (`data/will/will.json`). */
export interface VeaWillState {
  veaEntity: "will";
  schemaVersion: typeof WILL_SCHEMA_VERSION;
  draft: WillDraft;
  wishes: WishesDocument;
  physicalRecord: PhysicalWillRecord;
}

export const parseVeaWillState = (input: unknown): ParseResult<VeaWillState> =>
  run(
    object<VeaWillState>({
      veaEntity: literalString("will"),
      schemaVersion,
      draft: willDraftParser,
      wishes: wishesDocumentParser,
      physicalRecord: physicalWillRecordParser,
    }),
    input,
  );
