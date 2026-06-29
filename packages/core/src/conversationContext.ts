import type { ChatMessage, ConversationContext } from "@plenz/types"

const DEFAULT_TOTAL_TOKEN_BUDGET = 1500
const DEFAULT_SUMMARY_TOKEN_BUDGET = 300
const MIN_MESSAGE_TEXT_LENGTH = 8
const SUMMARY_CHAR_LIMIT = 1000

const NOISE_PATTERNS = [
	/^copy$/i,
	/^edit$/i,
	/^share$/i,
	/^retry$/i,
	/^regenerate$/i,
	/^like$/i,
	/^dislike$/i,
	/^read aloud$/i,
	/^search$/i,
	/^sources?$/i,
	/^new chat$/i,
]

const CONSTRAINT_PATTERNS = [
	/\bmust\b/i,
	/\bshould\b/i,
	/\bwithout\b/i,
	/\bonly\b/i,
	/\bavoid\b/i,
	/\binclude\b/i,
	/\bexclude\b/i,
	/\bformat\b/i,
	/\bjson\b/i,
	/\bmarkdown\b/i,
	/\bdeadline\b/i,
]

type BuildConversationContextInput = {
	platform: string
	activeWebsite: string
	currentDraft: string
	messages: ChatMessage[]
	previousSummary?: string
	tokenBudget?: number
	summaryTokenBudget?: number
}

type KeywordMap = Map<string, number>

export function estimateTokens(text: string) {
	return Math.ceil(text.length / 4)
}

function normalizeText(text: string) {
	return text.replace(/\s+/g, " ").trim()
}

function isNoiseMessage(text: string, currentDraft: string) {
	const normalized = normalizeText(text)
	if (normalized.length < MIN_MESSAGE_TEXT_LENGTH) return true
	if (normalized === normalizeText(currentDraft)) return true
	return NOISE_PATTERNS.some((pattern) => pattern.test(normalized))
}

function tokenize(text: string) {
	return normalizeText(text.toLowerCase())
		.split(/[^a-z0-9_.#++-]+/i)
		.filter((token) => token.length >= 3)
}

function buildKeywordMap(text: string): KeywordMap {
	const map: KeywordMap = new Map()
	for (const token of tokenize(text)) {
		map.set(token, (map.get(token) ?? 0) + 1)
	}
	return map
}

function scoreMessage(message: ChatMessage, draftKeywords: KeywordMap, index: number, total: number) {
	const messageKeywords = tokenize(message.text)
	let overlap = 0

	for (const token of messageKeywords) {
		if (draftKeywords.has(token)) {
			overlap += draftKeywords.get(token) ?? 1
		}
	}

	const recency = total > 1 ? index / (total - 1) : 1
	const roleScore = message.role === "user" ? 2 : message.role === "assistant" ? 1 : 0
	const constraintScore = CONSTRAINT_PATTERNS.some((pattern) => pattern.test(message.text)) ? 2 : 0

	return overlap * 3 + recency * 4 + roleScore + constraintScore
}

function uniqueMessages(messages: ChatMessage[], currentDraft: string) {
	const seen = new Set<string>()
	const filtered: ChatMessage[] = []

	for (const message of messages) {
		const text = normalizeText(message.text)
		const key = `${message.role}:${text.toLowerCase()}`
		if (seen.has(key) || isNoiseMessage(text, currentDraft)) continue
		seen.add(key)
		filtered.push({
			...message,
			text,
		})
	}

	return filtered
}

function getLatestExchange(messages: ChatMessage[]) {
	const latest: ChatMessage[] = []

	for (let i = messages.length - 1; i >= 0; i--) {
		const message = messages[i]
		if (!message) continue
		if (!latest.some((item) => item.role === message.role)) {
			latest.unshift(message)
		}
		if (
			latest.some((item) => item.role === "user") &&
			latest.some((item) => item.role === "assistant")
		) {
			break
		}
	}

	return latest
}

function truncateText(text: string, maxChars: number) {
	const normalized = normalizeText(text)
	if (normalized.length <= maxChars) return normalized
	return `${normalized.slice(0, Math.max(0, maxChars - 1)).trim()}...`
}

function getMessageKey(message: ChatMessage) {
	return `${message.role}:${message.text.toLowerCase()}`
}

function truncateMessageToTokens(message: ChatMessage, maxTokens: number) {
	return {
		...message,
		text: truncateText(message.text, Math.max(0, maxTokens * 4 - 4)),
	}
}

function collectMatches(messages: ChatMessage[], patterns: RegExp[], limit: number) {
	const values: string[] = []

	for (const message of messages) {
		if (!patterns.some((pattern) => pattern.test(message.text))) continue
		const text = truncateText(message.text, 140)
		if (!values.includes(text)) {
			values.push(text)
		}
		if (values.length >= limit) break
	}

	return values
}

function collectEntities(messages: ChatMessage[], limit: number) {
	const values: string[] = []
	const entityPattern = /\b(?:[A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)?|[a-zA-Z0-9_.-]+\.(?:js|ts|tsx|jsx|json|md|css|html)|@[a-zA-Z0-9_-]+|#[a-zA-Z0-9_-]+)\b/g

	for (const message of messages) {
		for (const match of message.text.matchAll(entityPattern)) {
			const value = match[0]
			if (value.length < 3 || values.includes(value)) continue
			values.push(value)
			if (values.length >= limit) return values
		}
	}

	return values
}

export function buildRollingSummary(messages: ChatMessage[], currentDraft: string, previousSummary?: string) {
	if (messages.length === 0) {
		return previousSummary || ""
	}

	const recentMessages = messages.slice(-12)
	const userMessages = recentMessages.filter((message) => message.role === "user")
	const goal = userMessages[userMessages.length - 1]?.text ?? currentDraft
	const constraints = collectMatches(recentMessages, CONSTRAINT_PATTERNS, 3)
	const unresolvedQuestions = collectMatches(recentMessages, [/\?$/, /\bwhich\b/i, /\bhow\b/i, /\bwhat\b/i], 3)
	const preferences = collectMatches(recentMessages, [/\bi prefer\b/i, /\bdefault\b/i, /\bopt[- ]?in\b/i, /\bavoid\b/i], 3)
	const entities = collectEntities(recentMessages, 8)

	const parts = [
		`Goal: ${truncateText(goal, 220)}`,
		constraints.length ? `Constraints: ${constraints.join(" | ")}` : "",
		entities.length ? `Entities: ${entities.join(", ")}` : "",
		preferences.length ? `Preferences: ${preferences.join(" | ")}` : "",
		unresolvedQuestions.length ? `Open questions: ${unresolvedQuestions.join(" | ")}` : "",
	].filter(Boolean)

	const summary = truncateText(parts.join("\n"), SUMMARY_CHAR_LIMIT)
	return summary || previousSummary || ""
}

export function buildConversationContext(input: BuildConversationContextInput): ConversationContext {
	const tokenBudget = input.tokenBudget ?? DEFAULT_TOTAL_TOKEN_BUDGET
	const summaryTokenBudget = input.summaryTokenBudget ?? DEFAULT_SUMMARY_TOKEN_BUDGET
	const messageBudget = Math.max(0, tokenBudget - summaryTokenBudget)
	const filtered = uniqueMessages(input.messages, input.currentDraft)
	const rollingSummary = buildRollingSummary(filtered, input.currentDraft, input.previousSummary)
	const summaryTokens = rollingSummary ? Math.min(estimateTokens(rollingSummary), summaryTokenBudget) : 0
	const availableMessageTokens = Math.max(0, tokenBudget - summaryTokens)
	const latestExchange = getLatestExchange(filtered)
	const selected = new Map<string, ChatMessage>()
	let usedTokens = 0

	for (const message of latestExchange) {
		const remainingTokens = availableMessageTokens - usedTokens
		if (remainingTokens <= 0) break
		const tokens = estimateTokens(message.text)
		if (tokens <= remainingTokens) {
			selected.set(getMessageKey(message), message)
			usedTokens += tokens
		} else if (selected.size === 0) {
			const truncated = truncateMessageToTokens(message, remainingTokens)
			selected.set(getMessageKey(message), truncated)
			usedTokens += estimateTokens(truncated.text)
		}
	}

	const draftKeywords = buildKeywordMap(input.currentDraft)
	const ranked = filtered
		.map((message, index) => ({
			message,
			score: scoreMessage(message, draftKeywords, index, filtered.length),
		}))
		.sort((a, b) => b.score - a.score)

	for (const { message } of ranked) {
		if (selected.has(getMessageKey(message))) continue
		const tokens = estimateTokens(message.text)
		if (usedTokens + tokens > Math.min(messageBudget, availableMessageTokens)) continue
		selected.set(getMessageKey(message), message)
		usedTokens += tokens
	}

	const recentMessages = filtered
		.map((message) => selected.get(getMessageKey(message)))
		.filter((message): message is ChatMessage => !!message)
	const tokenEstimate = usedTokens + summaryTokens

	return {
		platform: input.platform,
		activeWebsite: input.activeWebsite,
		recentMessages,
		rollingSummary,
		tokenEstimate,
		truncated: filtered.length > recentMessages.length || tokenEstimate > tokenBudget,
	}
}
