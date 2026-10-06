export const PROFILE_SCHEMA_VERSION = 1;
export const MAX_FIRST_NAME_LENGTH = 40;

/** What is encrypted inside the profile record. */
export interface Profile {
  readonly schemaVersion: typeof PROFILE_SCHEMA_VERSION;
  readonly firstName: string;
}

export function normalizeFirstName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, MAX_FIRST_NAME_LENGTH);
}

export function isValidFirstName(raw: string): boolean {
  return normalizeFirstName(raw).length > 0;
}
