import {
	ProviderAdapter,
	ProviderConfig,
	ConnectionTestResult,
	AnalysisResult,
	Suggestion,
} from "@promptlens/types"

export class GoogleAdapter implements ProviderAdapter {
	id = "google"
	name = "Google Gemini"
	models = [
		{ id: "gemini-3-pro", name: "Gemini 3 Pro", tier: "premium" as const },
		{
			id: "gemini-3-flash-preview",
			name: "Gemini 3 Flash",
			tier: "standard" as const,
		},
		{
			id: "gemini-3-pro-preview",
			name: "Gemini 3 Pro Preview",
			tier: "standard" as const,
		},
		{
			id: "gemini-2.5-flash",
			name: "Gemini 2.5 Flash",
			tier: "standard" as const,
		},
		{
			id: "gemini-2.5-flash-lite",
			name: "Gemini 2.5 Flash Lite",
			tier: "standard" as const,
		},
		{
			id: "gemini-2.5-pro",
			name: "Gemini 2.5 Pro",
			tier: "standard" as const,
		},
	]

	private normalizeSuggestions(raw: unknown): Suggestion[] {
		const validTypes: Suggestion["type"][] = [
			"rewrite",
			"add_context",
			"add_constraints",
			"add_role",
			"add_format",
			"clarify",
		]

		if (!Array.isArray(raw)) return []

		return raw
			.map((item, idx) => {
				const value = item as Record<string, unknown>

				const suggested =
					(typeof value.suggested === "string" && value.suggested) ||
					(typeof value.suggested_text === "string" && value.suggested_text) ||
					""
				if (!suggested) return null

				const original =
					(typeof value.original === "string" && value.original) ||
					(typeof value.original_text === "string" && value.original_text) ||
					""

				const type = validTypes.includes(value.type as Suggestion["type"])
					? (value.type as Suggestion["type"])
					: "clarify"

				const confidenceValue =
					typeof value.confidence === "number" ? value.confidence : 0.7
				const confidence = Math.max(0, Math.min(1, confidenceValue))

				return {
					id:
						(typeof value.id === "string" && value.id) ||
						`suggestion-${idx + 1}`,
					type,
					original,
					suggested,
					rationale:
						(typeof value.rationale === "string" && value.rationale) ||
						"Improves prompt clarity.",
					confidence,
				}
			})
			.filter((item): item is Suggestion => item !== null)
	}

	private getUrl(model: string) {
		return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
	}

	private parseJsonObject(text: string): Record<string, unknown> {
		const trimmed = text.trim()
		const candidates = [trimmed]

		const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
		if (fencedMatch?.[1]) {
			candidates.push(fencedMatch[1].trim())
		}

		const firstBrace = trimmed.indexOf("{")
		const lastBrace = trimmed.lastIndexOf("}")
		if (firstBrace !== -1 && lastBrace > firstBrace) {
			candidates.push(trimmed.slice(firstBrace, lastBrace + 1))
		}

		for (const candidate of candidates) {
			try {
				return JSON.parse(candidate) as Record<string, unknown>
			} catch {
				// Try next candidate.
			}
		}

		throw new Error("Invalid JSON response from Gemini")
	}

	private extractSuggestionsFromTruncatedText(text: string): Suggestion[] {
		const keyIndex = text.indexOf('"suggestions"')
		if (keyIndex === -1) return []

		const arrayStart = text.indexOf("[", keyIndex)
		if (arrayStart === -1) return []

		const rawItems: unknown[] = []
		let inString = false
		let escaped = false
		let depth = 0
		let objectStart = -1

		for (let i = arrayStart + 1; i < text.length; i++) {
			const ch = text[i]

			if (inString) {
				if (escaped) {
					escaped = false
					continue
				}
				if (ch === "\\") {
					escaped = true
					continue
				}
				if (ch === '"') {
					inString = false
				}
				continue
			}

			if (ch === '"') {
				inString = true
				continue
			}

			if (ch === "{") {
				if (depth === 0) objectStart = i
				depth++
				continue
			}

			if (ch === "}") {
				if (depth > 0) {
					depth--
					if (depth === 0 && objectStart !== -1) {
						const objectText = text.slice(objectStart, i + 1)
						try {
							rawItems.push(JSON.parse(objectText))
						} catch {
							// Ignore malformed object fragments.
						}
						objectStart = -1
					}
				}
				continue
			}

			if (ch === "]" && depth === 0) {
				break
			}
		}

		return this.normalizeSuggestions(rawItems)
	}

	async testConnection(config: ProviderConfig): Promise<ConnectionTestResult> {
		const start = performance.now()
		try {
			const res = await fetch(this.getUrl(config.model), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-goog-api-key": config.apiKey,
				},
				body: JSON.stringify({
					contents: [{ parts: [{ text: "ping" }] }],
					generationConfig: {
						maxOutputTokens: 5,
					},
				}),
			})
			const latency = Math.round(performance.now() - start)
			if (!res.ok) {
				const err = await res.json()
				return {
					success: false,
					latencyMs: latency,
					error: err.error?.message || "Connection failed",
				}
			}
			return { success: true, latencyMs: latency }
		} catch (e) {
			return { success: false, latencyMs: 0, error: (e as Error).message }
		}
	}

	async analyze(
		prompt: string,
		systemPrompt: string,
		config: ProviderConfig,
		context?: { active_website?: string }
	): Promise<AnalysisResult> {
		const start = performance.now()
		const res = await fetch(this.getUrl(config.model), {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-goog-api-key": config.apiKey,
			},
			body: JSON.stringify({
				contents: [
					{
						role: "user",
						parts: [{ text: systemPrompt }],
					},
					{
						role: "user",
						parts: [{
							text: context?.active_website
								? `[Context: ${context.active_website}]\n\n${prompt}`
								: prompt
						}],
					},
				],
				generationConfig: {
					maxOutputTokens: config.maxTokens ?? 1024,
					temperature: config.temperature ?? 0.3,
					responseMimeType: "application/json",
				},
			}),
		})

		const data = await res.json()
		const latency = Math.round(performance.now() - start)

		if (!res.ok) {
			throw new Error(data.error?.message || "Gemini API error")
		}

		const parts = data.candidates?.[0]?.content?.parts
		const text = Array.isArray(parts)
			? parts
				.map((part: Record<string, unknown>) =>
					typeof part.text === "string" ? part.text : "",
				)
				.join("\n")
				.trim()
			: ""
		let parsed: Record<string, unknown> = {}
		let suggestions: Suggestion[] = []
		if (typeof text === "string" && text.trim()) {
			try {
				parsed = this.parseJsonObject(text)
				suggestions = this.normalizeSuggestions(parsed.suggestions)
			} catch {
				// Recover complete objects when JSON is truncated (e.g. MAX_TOKENS).
				suggestions = this.extractSuggestionsFromTruncatedText(text)
			}
		}

		return {
			suggestions,
			rawResponse: JSON.stringify(data),
			tokensUsed: {
				prompt: data.usageMetadata?.promptTokenCount ?? 0,
				completion: data.usageMetadata?.candidatesTokenCount ?? 0,
			},
			latencyMs: latency,
		}
	}
}
