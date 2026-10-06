export const CODE_LENGTH = 6;

export type CodeProblem = "format" | "repeated" | "sequence";

const SEQUENCE = "01234567890";
const REVERSED = "09876543210";

/** Rules for the 6-digit application code. Pure: no framework, no browser. */
export function checkCode(code: string): CodeProblem | null {
  if (!new RegExp(`^[0-9]{${CODE_LENGTH}}$`).test(code)) return "format";
  if (/^(\d)\1+$/.test(code)) return "repeated";
  if (SEQUENCE.includes(code) || REVERSED.includes(code)) return "sequence";
  return null;
}
