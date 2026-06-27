export interface PlatformConfig {
	name: string
	hostPatterns: string[]
	inputSelectors: string[]
	messageSelectors: Array<{
		selector: string
		role: "user" | "assistant" | "unknown"
	}>
	submitButtonSelectors: string[]
	containerSelector: string
	inputType: "contenteditable" | "textarea" | "prosemirror"
}

export const PLATFORM_REGISTRY: PlatformConfig[] = [
	{
		name: "chatgpt",
		hostPatterns: ["chatgpt.com", "chat.openai.com"],
		inputSelectors: ["#prompt-textarea", '[data-id="root"] textarea'],
		messageSelectors: [
			{ selector: '[data-message-author-role="user"]', role: "user" },
			{ selector: '[data-message-author-role="assistant"]', role: "assistant" },
		],
		submitButtonSelectors: ['[data-testid="send-button"]'],
		containerSelector: "form",
		inputType: "contenteditable",
	},
	{
		name: "claude",
		hostPatterns: ["claude.ai"],
		inputSelectors: [
			'[contenteditable="true"].ProseMirror',
			"fieldset .ProseMirror",
		],
		messageSelectors: [
			{ selector: '[data-testid="user-message"]', role: "user" },
			{ selector: '[data-testid="assistant-message"]', role: "assistant" },
			{ selector: ".font-claude-message", role: "assistant" },
		],
		submitButtonSelectors: ['button[aria-label="Send Message"]'],
		containerSelector: "fieldset",
		inputType: "prosemirror",
	},
	{
		name: "gemini",
		hostPatterns: ["gemini.google.com"],
		inputSelectors: ["rich-textarea .ql-editor", ".text-input-field textarea"],
		messageSelectors: [
			{ selector: ".user-query-container", role: "user" },
			{ selector: ".model-response-text", role: "assistant" },
			{ selector: "message-content", role: "assistant" },
		],
		submitButtonSelectors: [
			"button.send-button",
			'[aria-label="Send message"]',
		],
		containerSelector: ".input-area",
		inputType: "contenteditable",
	},
	{
		name: "perplexity",
		hostPatterns: ["perplexity.ai"],
		inputSelectors: ['textarea[placeholder*="Ask"]', "textarea.overflow-auto"],
		messageSelectors: [
			{ selector: '[data-testid="user-message"]', role: "user" },
			{ selector: '[data-testid="answer"]', role: "assistant" },
			{ selector: "main article", role: "unknown" },
		],
		submitButtonSelectors: ['button[aria-label="Submit"]'],
		containerSelector: "form",
		inputType: "textarea",
	},
]

export function getActivePlatform(): PlatformConfig | null {
	const host = window.location.hostname
	return (
		PLATFORM_REGISTRY.find((p) =>
			p.hostPatterns.some((pattern) => host.includes(pattern)),
		) || null
	)
}
