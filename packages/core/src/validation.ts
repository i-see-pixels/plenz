import type { Suggestion } from "@plenz/types"

const VALID_SUGGESTION_TYPES: Suggestion["type"][] = [
	"rewrite",
	"add_context",
	"add_constraints",
	"add_role",
	"add_format",
	"clarify",
]

function clampConfidence(value: unknown) {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return 0.7
	}

	return Math.max(0, Math.min(1, value))
}

export class SuggestionValidationError extends Error {
	constructor(message = "Provider returned suggestions that were too short or incomplete") {
		super(message)
		this.name = "SuggestionValidationError"
	}
}

function stripCodeFence(text: string) {
	return text.replace(/^```[a-zA-Z0-9_-]*\s*|\s*```$/g, "").trim()
}

function isCodeFenceOnly(text: string) {
	return /^```[a-zA-Z0-9_-]*\s*[\s\S]*?\s*```$/.test(text.trim())
}

function isTooCompressedSuggestion(suggested: string, sourcePrompt?: string) {
	const wordCount = suggested.split(/\s+/).filter(Boolean).length
	if (!sourcePrompt) return suggested.length < 80 || wordCount < 14

	const source = sourcePrompt.trim()
	if (suggested.toLowerCase() === source.toLowerCase()) return true

	if (source.length < 180) {
		const minLength = Math.max(80, Math.min(180, Math.floor(source.length * 1.35)))
		return suggested.length < minLength || wordCount < 14
	}

	const minLength = Math.min(400, Math.max(140, Math.floor(source.length * 0.65)))
	return suggested.length < minLength || wordCount < 20
}

function dropsStrictFormatConstraints(suggested: string, sourcePrompt?: string) {
	if (!sourcePrompt) return false

	const source = sourcePrompt.toLowerCase()
	const output = suggested.toLowerCase()
	const strictTerms = ["only", "nothing else", "do not", "don't", "code block", "curly brackets"]
	const presentTerms = strictTerms.filter((term) => source.includes(term))

	if (presentTerms.length < 2) return false
	return presentTerms.filter((term) => output.includes(term)).length === 0
}

function isLowQualitySuggestion(suggested: string, sourcePrompt?: string) {
	const normalized = suggested.trim()
	const unfenced = stripCodeFence(normalized)

	if (!unfenced) return true
	if (isCodeFenceOnly(normalized) && unfenced.split(/\s+/).length <= 8) return true
	if (isTooCompressedSuggestion(normalized, sourcePrompt)) return true
	if (dropsStrictFormatConstraints(normalized, sourcePrompt)) return true

	return false
}

export function validateSuggestions(raw: unknown, limit = 5, sourcePrompt?: string): Suggestion[] {
	if (!Array.isArray(raw)) {
		throw new SuggestionValidationError()
	}

	const suggestions = raw
		.map((item, index) => {
			if (!item || typeof item !== "object") return null
			const value = item as Record<string, unknown>
			const suggested =
				(typeof value.suggested === "string" && value.suggested.trim()) ||
				(typeof value.suggested_text === "string" && value.suggested_text.trim()) ||
				""

			if (!suggested) return null
			if (isLowQualitySuggestion(suggested, sourcePrompt)) return null

			const type = VALID_SUGGESTION_TYPES.includes(value.type as Suggestion["type"])
				? (value.type as Suggestion["type"])
				: "clarify"

			return {
				id:
					(typeof value.id === "string" && value.id.trim()) ||
					`suggestion-${index + 1}`,
				type,
				original:
					(typeof value.original === "string" && value.original) ||
					(typeof value.original_text === "string" && value.original_text) ||
					"",
				suggested,
				rationale:
					(typeof value.rationale === "string" && value.rationale.trim()) ||
					"Improves prompt clarity.",
				confidence: clampConfidence(value.confidence),
			}
		})
		.filter((item): item is Suggestion => item !== null)
		.slice(0, limit)

	if (suggestions.length === 0) {
		throw new SuggestionValidationError()
	}

	return suggestions
}
