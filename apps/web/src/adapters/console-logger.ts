import type { LogFields, Logger } from "@veille/core/ports";

/** Content-free logger: event codes and numeric/boolean fields only (AGENTS.md §6.3). */
export class ConsoleLogger implements Logger {
  private emit(
    level: "debug" | "info" | "warn" | "error",
    event: string,
    fields?: LogFields,
  ): void {
    if (import.meta.env.PROD && level === "debug") return;
    console[level](`[veille] ${event}`, fields ?? {});
  }
  debug(event: string, fields?: LogFields): void {
    this.emit("debug", event, fields);
  }
  info(event: string, fields?: LogFields): void {
    this.emit("info", event, fields);
  }
  warn(event: string, fields?: LogFields): void {
    this.emit("warn", event, fields);
  }
  error(event: string, fields?: LogFields): void {
    this.emit("error", event, fields);
  }
}
