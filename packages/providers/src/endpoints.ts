// URL helpers for OpenAI-compatible APIs.

/**
 * Accepts a provider base URL or a full chat completions endpoint and returns
 * the chat completions endpoint.
 */
export function resolveChatCompletionsUrl(baseUrl: string): string {
  let formatted = baseUrl.trim();
  if (formatted.endsWith("/")) formatted = formatted.slice(0, -1);

  try {
    const pathname = new URL(formatted).pathname.replace(/\/+$/, "");
    return pathname.endsWith("/chat/completions")
      ? formatted
      : `${formatted}/chat/completions`;
  } catch {
    return formatted;
  }
}

export function modelsUrlFor(chatCompletionsUrl: string) {
  return `${chatCompletionsUrl.replace(/\/chat\/completions$/, "")}/models`;
}
