import type { WillClock, WillHasher } from "@veille/core/will";

/** SHA-256 through WebCrypto — the will domain never touches `crypto` itself (AGENTS.md §4). */
export class WebCryptoHasher implements WillHasher {
  readonly algorithm = "sha-256" as const;

  constructor(private readonly subtle: SubtleCrypto = crypto.subtle) {}

  async hashHex(input: string): Promise<string> {
    const digest = await this.subtle.digest("SHA-256", new TextEncoder().encode(input));
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
}

export class IsoClock implements WillClock {
  nowIso(): string {
    return new Date().toISOString();
  }
}
