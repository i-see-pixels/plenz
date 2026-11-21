// The slice of @plenz/types that refine.ts uses.
export type RefineMode = "improve" | "tighten" | "structure" | "ask";

export interface RefineContext {
  active_website?: string;
  conversation?: {
    rollingSummary?: string;
    recentMessages: { role: string; text: string }[];
    truncated?: boolean;
  };
}

export interface CompletionRequest {
  system: string;
  user: string;
  maxTokens: number;
  temperature: number;
}
