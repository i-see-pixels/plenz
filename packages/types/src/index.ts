export interface Suggestion {
	id: string
	type:
	| "rewrite"
	| "add_context"
	| "add_constraints"
	| "add_role"
	| "add_format"
	| "clarify"
	original: string
	suggested: string
	rationale: string
	confidence: number
	position?: { start: number; end: number }
}

export interface ChatMessage {
	role: "user" | "assistant" | "unknown"
	text: string
	timestamp?: number
}

export interface ConversationContext {
	platform: string
	activeWebsite: string
	recentMessages: ChatMessage[]
	rollingSummary?: string
	tokenEstimate: number
	truncated: boolean
}

export interface ProviderConfig {
	apiKey: string
	model: string
	baseUrl?: string
	maxTokens?: number
	temperature?: number
}

export interface ProviderAnalyzeContext {
	active_website?: string
	conversation?: ConversationContext
}

export interface ProviderAnalyzeOptions {
	signal?: AbortSignal
}

/** Status of key sync with the user's account */
export type SyncStatus = "synced" | "local-only" | "syncing" | "error"

/** Result returned by storage operations */
export interface StorageResult<T> {
	data: T | null
	syncStatus: SyncStatus
	error?: string
}

export interface ConnectionTestResult {
	success: boolean
	latencyMs: number
	error?: string
}

export interface AnalysisResult {
	suggestions: Suggestion[]
	rawResponse: string
	tokensUsed: { prompt: number; completion: number }
	latencyMs: number
}

export interface ModelOption {
	id: string
	name: string
	tier: "premium" | "standard" | "budget"
}

export type PromptGalleryCategory = "trending" | "newest" | "saved"

export interface PublicPrompt {
	id: string
	title: string
	prompt: string
	slug: string
	category: string[]
	trendScore: number | null
	createdAt: string | null
	updatedAt: string | null
	canShare: boolean
}

export interface SavedPrompt {
	id: string
	title: string
	prompt: string
	category: string[]
	sourceType: "catalog" | "custom"
	catalogPromptId: string | null
	catalogSlug: string | null
	savedAt: string | null
	createdAt: string | null
	updatedAt: string | null
	canShare: boolean
}

export interface ProviderAdapter {
	id: string
	name: string
	fetchModels(config: ProviderConfig): Promise<ModelOption[]>
	testConnection(config: ProviderConfig): Promise<ConnectionTestResult>
	analyze(
		prompt: string,
		systemPrompt: string,
		config: ProviderConfig,
		context?: ProviderAnalyzeContext,
		options?: ProviderAnalyzeOptions
	): Promise<AnalysisResult>
}
