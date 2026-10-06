/** Document content handed to a model. Always untrusted data, never instructions (AGENTS.md §5.7). */
export interface UntrustedSource {
  readonly documentId: string;
  readonly title: string;
  readonly content: string;
}

export interface AIRequest {
  readonly question: string;
  /** Only documents the user explicitly put in scope for this question (AGENTS.md §7.3). */
  readonly sources: readonly UntrustedSource[];
}

export interface AICitation {
  readonly documentId: string;
  readonly passage: string;
}

export interface AIAnswer {
  readonly text: string;
  readonly citations: readonly AICitation[];
}

export interface AIProvider {
  /** Where the processing happens; the UI must show it. Remote needs explicit per-use consent. */
  readonly locality: "on-device" | "remote";
  ask(request: AIRequest): Promise<AIAnswer>;
}
