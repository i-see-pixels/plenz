import { GeneratedPrompt } from "./promptGenerator";
import { IntentMatch } from "./intentDetector";
import { Suggestion } from "@promptlens/types";

export class PromptRanker {
    rank(generated: GeneratedPrompt[], intentMatch: IntentMatch): Suggestion[] {
        const scored = generated.map((gp, index) => {
            // Score calculation:
            // 0.5 * intent confidence
            // 0.3 * percentage of variables filled (relative to variables in template)
            // 0.2 * quality (simple heuristic: length and presence of original text)

            const templateVariablesCount = (gp.sourceTemplate.match(/{[a-z_]+}/g) || []).length;
            const fillRate = templateVariablesCount > 0 ? gp.filledVariables.length / templateVariablesCount : 1;

            const score =
                (0.5 * intentMatch.confidence) +
                (0.3 * fillRate) +
                (0.2 * (gp.text.length > 20 ? 1 : 0.5));

            return {
                id: `gen-${index}`,
                type: "rewrite" as const,
                original: "", // Will be filled if needed, or left empty for suggestions
                suggested: gp.text,
                rationale: `Matched intent: ${intentMatch.intent}. Relevancy score: ${score.toFixed(2)}`,
                confidence: score
            };
        });

        return scored
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 3);
    }
}
