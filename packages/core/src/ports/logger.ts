/**
 * Structured, content-free logging (AGENTS.md §6.3). `event` is a stable code
 * such as `unlock.failed`; fields can only be numbers or booleans so that no
 * name, address, extract or prompt can be passed by mistake.
 */
export type LogFields = Readonly<Record<string, number | boolean>>;

export interface Logger {
  debug(event: string, fields?: LogFields): void;
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
}
