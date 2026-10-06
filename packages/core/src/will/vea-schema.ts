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
} from "./model";

/**
 * JSON Schema (draft 2020-12) shipped in the archive as `schemas/will.schema.json`, so that the
 * archive stays readable without Veille (ADR-0006). Enumerations come from the same constants as
 * the runtime parser; a test keeps property names aligned with the entities.
 */

type Json = Record<string, unknown>;

const text = (max: number): Json => ({ type: "string", maxLength: max });
const enumOf = (values: readonly string[]): Json => ({ enum: [...values] });
const obj = (properties: Record<string, Json>): Json => ({
  type: "object",
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});
const list = (items: Json): Json => ({ type: "array", maxItems: LIMITS.items, items });
const ref = (name: string): Json => ({ $ref: `#/$defs/${name}` });
const version = { const: WILL_SCHEMA_VERSION };
const sha256 = { type: "string", pattern: "^[0-9a-f]{64}$" };

export const SITUATION_PROPERTIES = [
  "maritalStatus",
  "spousalDonation",
  "hasChildren",
  "hasMinorChildren",
  "blendedFamily",
  "lifeInsurance",
  "ownsRealEstate",
  "ownsBusinessInterests",
  "assetsAbroad",
  "residesOutsideFrance",
  "foreignNationality",
  "legalProtection",
] as const;

export function buildWillJsonSchema(): Json {
  const answer = enumOf(ANSWERS);
  const situation: Record<string, Json> = Object.fromEntries(
    SITUATION_PROPERTIES.map((k) => [k, answer]),
  );
  situation["maritalStatus"] = enumOf(MARITAL_STATUSES);
  situation["legalProtection"] = enumOf(LEGAL_PROTECTIONS);

  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "Veille — will domain (VEA)",
    description:
      "Three distinct objects: a draft to be copied by hand, non-testamentary wishes, and the declared location of a handwritten will. None of them is a valid will; integrity hashes are not legal proof.",
    $defs: {
      WillDraft: obj({
        schemaVersion: version,
        testatorFullName: text(LIMITS.shortText),
        situation: obj(situation),
        beneficiaries: list(
          obj({
            id: text(LIMITS.shortText),
            kind: enumOf(BENEFICIARY_KINDS),
            displayName: text(LIMITS.shortText),
            isMinor: answer,
          }),
        ),
        provisions: list(
          obj({
            id: text(LIMITS.shortText),
            beneficiaryId: text(LIMITS.shortText),
            subject: text(LIMITS.longText),
            clause: enumOf(PROVISION_CLAUSES),
          }),
        ),
        handwritingGuideAcknowledged: { type: "boolean" },
      }),
      WishesDocument: obj({
        schemaVersion: version,
        funeralWishes: text(LIMITS.longText),
        messages: list(
          obj({
            id: text(LIMITS.shortText),
            recipientLabel: text(LIMITS.shortText),
            text: text(LIMITS.longText),
          }),
        ),
        papers: list(
          obj({
            id: text(LIMITS.shortText),
            label: text(LIMITS.shortText),
            location: text(LIMITS.longText),
          }),
        ),
        hasBodyWishes: answer,
        bodyWishesNote: text(LIMITS.longText),
      }),
      PhysicalWillRecord: obj({
        schemaVersion: version,
        existence: enumOf(WILL_EXISTENCES),
        locationKind: enumOf(WILL_LOCATION_KINDS),
        locationDetail: text(LIMITS.longText),
        registeredInCentralFile: answer,
      }),
      WillState: obj({
        veaEntity: { const: "will" },
        schemaVersion: version,
        draft: ref("WillDraft"),
        wishes: ref("WishesDocument"),
        physicalRecord: ref("PhysicalWillRecord"),
      }),
      WillVersion: {
        ...obj({
          schemaVersion: version,
          subject: enumOf(WILL_SUBJECTS),
          sequence: { type: "integer", minimum: 1 },
          createdAt: { type: "string", format: "date-time" },
          hashAlgorithm: { const: "sha-256" },
          previousHash: { oneOf: [sha256, { type: "null" }] },
          hash: sha256,
          snapshot: { oneOf: [ref("WillDraft"), ref("WishesDocument"), ref("PhysicalWillRecord")] },
        }),
      },
    },
  };
}
