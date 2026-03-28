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

export interface ProviderConfig {
	apiKey: string
	model: string
	baseUrl?: string
	maxTokens?: number
	temperature?: number
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

export interface ProviderAdapter {
	id: string
	name: string
	fetchModels(config: ProviderConfig): Promise<ModelOption[]>
	testConnection(config: ProviderConfig): Promise<ConnectionTestResult>
	analyze(
		prompt: string,
		systemPrompt: string,
		config: ProviderConfig,
		context?: { active_website?: string }
	): Promise<AnalysisResult>
}
