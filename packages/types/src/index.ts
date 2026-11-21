export interface ChatMessage {
  role: "user" | "assistant" | "unknown";
  text: string;
  timestamp?: number;
}

export interface ConversationContext {
  platform: string;
  activeWebsite: string;
  recentMessages: ChatMessage[];
  rollingSummary?: string;
  tokenEstimate: number;
  truncated: boolean;
}

export interface ProviderConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

/** Where the draft is being written, sent along with a refine. */
export interface RefineContext {
  active_website?: string;
  conversation?: ConversationContext;
}

/** The refine modes a user can pick. */
export type RefineMode = "improve" | "tighten" | "structure" | "ask";

/** A provider-agnostic completion request: one system and one user message. */
export interface CompletionRequest {
  system: string;
  user: string;
  maxTokens: number;
  temperature: number;
}

export interface StreamOptions {
  signal?: AbortSignal;
  /** Called with each chunk of text as it arrives. */
  onDelta?: (text: string) => void;
}

export interface CompletionResult {
  text: string;
  tokensUsed: { prompt: number; completion: number };
  latencyMs: number;
}

/** Status of key sync with the user's account */
export type SyncStatus = "synced" | "local-only" | "syncing" | "error";

/** Result returned by storage operations */
export interface StorageResult<T> {
  data: T | null;
  syncStatus: SyncStatus;
  error?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  latencyMs: number;
  error?: string;
}

export interface ModelOption {
  id: string;
  name: string;
  tier: "premium" | "standard" | "budget";
}

export type PromptGalleryCategory = "trending" | "newest" | "saved";

export interface PublicPrompt {
  id: string;
  title: string;
  prompt: string;
  slug: string;
  category: string[];
  trendScore: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  canShare: boolean;
}

export interface SavedPrompt {
  id: string;
  title: string;
  prompt: string;
  category: string[];
  sourceType: "catalog" | "custom";
  catalogPromptId: string | null;
  catalogSlug: string | null;
  savedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  canShare: boolean;
}

export interface ProviderAdapter {
  id: string;
  name: string;
  /** False for providers that work without a key (on-device, local servers). Defaults to true. */
  needsApiKey?: boolean;
  fetchModels(config: ProviderConfig): Promise<ModelOption[]>;
  testConnection(config: ProviderConfig): Promise<ConnectionTestResult>;
  /** Stream a completion; resolves with the full text once the stream ends. */
  streamCompletion(
    request: CompletionRequest,
    config: ProviderConfig,
    options?: StreamOptions,
  ): Promise<CompletionResult>;
}
