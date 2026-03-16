export interface BrowserContext {
    active_website: string;
    previous_messages?: string[];
    detected_code_blocks?: string[];
}

export class ContextBuilder {
    static build(): BrowserContext {
        return {
            active_website: window.location.hostname,
            // In a real scenario, we would scrape the DOM for previous messages or code blocks
            // For now, we return the hostname as the primary context
            previous_messages: this.scrapePreviousMessages(),
        };
    }

    private static scrapePreviousMessages(): string[] {
        // Basic heuristic to find message-like elements in common chat platforms
        const selectors = [
            '[class*="message"]',
            '[class*="chat-item"]',
            '[role="article"]'
        ];

        const messages: string[] = [];
        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                const text = el.textContent?.trim();
                if (text && text.length > 10 && text.length < 500) {
                    messages.push(text);
                }
            });
            if (messages.length > 0) break;
        }

        return messages.slice(-3); // Get last 3 messages
    }
}
