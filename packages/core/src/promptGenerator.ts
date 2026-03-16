import { Entities } from "./entityExtractor";
import { IntentType } from "./intentDetector";
import { TemplateEngine } from "./templateEngine";

export interface GeneratedPrompt {
    text: string;
    sourceTemplate: string;
    filledVariables: string[];
}

export class PromptGenerator {
    private engine = new TemplateEngine();

    generate(intent: IntentType, entities: Entities, originalText: string): GeneratedPrompt[] {
        const templates = this.engine.getTemplates(intent);

        return templates.map(template => {
            let filledText = template;
            const filledVariables: string[] = [];

            // Map entities to placeholders
            const mappings: Record<string, string | undefined> = {
                "{framework}": entities.framework || "the framework",
                "{language}": entities.language || "the language",
                "{error_type}": entities.error_type || "the error",
                "{topic}": entities.topic || "this topic",
                "{text}": originalText
            };

            for (const [placeholder, value] of Object.entries(mappings)) {
                if (filledText.includes(placeholder)) {
                    if (entities[placeholder.replace(/{|}/g, "") as keyof Entities] || placeholder === "{text}") {
                        filledVariables.push(placeholder);
                    }
                    filledText = filledText.replace(new RegExp(placeholder, "g"), value || "");
                }
            }

            return {
                text: filledText,
                sourceTemplate: template,
                filledVariables
            };
        });
    }
}
