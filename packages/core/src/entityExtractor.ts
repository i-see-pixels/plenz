export interface Entities {
    framework?: string;
    language?: string;
    error_type?: string;
    topic?: string;
}

export class EntityExtractor {
    private rules = {
        framework: [/\b(react|next\.js|nextjs|vue|svelte|angular|express|nest\.js|nestjs|django|flask|laravel|rails)\b/i],
        language: [/\b(javascript|js|typescript|ts|python|py|ruby|go|golang|rust|java|cpp|c\+\+|csharp|c#|php|sql|css|html)\b/i],
        error_type: [/\b(error|exception|bug|crash|fail|mismatch|undefined|null|timeout|panic)\b/i],
    };

    private siteFrameworkMap: Record<string, string> = {
        "nextjs.org": "Next.js",
        "vercel.com": "Next.js",
        "react.dev": "React",
        "vuejs.org": "Vue",
        "svelte.dev": "Svelte",
    };

    extract(text: string, context?: { active_website?: string }): Entities {
        const entities: Entities = {};
        const lowerText = text.toLowerCase();

        // 1. Context-based inference
        if (context?.active_website) {
            for (const [site, framework] of Object.entries(this.siteFrameworkMap)) {
                if (context.active_website.includes(site)) {
                    entities.framework = framework;
                    break;
                }
            }
        }

        // 2. Text-based extraction (overrides context if explicit)
        for (const [key, patterns] of Object.entries(this.rules)) {
            for (const pattern of patterns) {
                const match = text.match(pattern);
                if (match) {
                    entities[key as keyof Entities] = match[0];
                    break;
                }
            }
        }

        // 3. Topic extraction
        const topicMatch = text.match(/\b(?:about|for|on)\s+([a-zA-Z0-9._-]+(?:\s+[a-zA-Z0-9._-]+)*)\b/i);
        if (topicMatch && topicMatch[1]) {
            entities.topic = topicMatch[1].trim().split(/\s+/).slice(0, 3).join(" ");
        }

        return entities;
    }
}
