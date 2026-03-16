import { StorageManager } from "./storage";
import { providers } from "@promptlens/providers";
import {
  SYSTEM_PROMPT_TEMPLATE,
  IntentDetector,
  EntityExtractor,
  PromptGenerator,
  PromptRanker
} from "@promptlens/core";
import { AuthManager } from "./auth";

export async function handleMessage(
  message: any,
  sender: chrome.runtime.MessageSender,
) {
  switch (message.type) {
    case "GET_ACTIVE_MODEL":
      const config = await StorageManager.getActiveModelConfig();
      const prefs = await StorageManager.getPreferences();
      const response = {
        config,
        activeModelId: prefs.activeModelId,
        isConfigured: !!config?.apiKey,
      };
      return response;

    case "SET_ACTIVE_MODEL":
      await StorageManager.setPreferences({
        activeModelId: message.payload.modelId,
      });
      return { success: true };

    case "TEST_CONNECTION": {
      const { providerId, config } = message.payload;
      const provider = providers.find((p) => p.id === providerId);
      if (!provider) throw new Error(`Provider ${providerId} not found`);
      return await provider.testConnection(config);
    }

    case "ANALYZE_PROMPT": {
      const { prompt, context } = message.payload;

      // 1. Local Analysis (Fast)
      const intentDetector = new IntentDetector();
      const entityExtractor = new EntityExtractor();
      const promptGenerator = new PromptGenerator();
      const promptRanker = new PromptRanker();

      const intentMatch = intentDetector.detect(prompt);
      const entities = entityExtractor.extract(prompt, context);

      const generated = promptGenerator.generate(intentMatch.intent, entities, prompt);
      const suggestions = promptRanker.rank(generated, intentMatch);

      // 2. Remote Analysis (Optional/Enrichment)
      // If we have high confidence local suggestions, we might skip or use LLM to refine
      try {
        const config = await StorageManager.getActiveModelConfig();
        if (config && config.apiKey) {
          const provider = providers.find((p) =>
            p.models.some((m) => m.id === config.model),
          );
          if (provider) {
            const remoteResult = await provider.analyze(prompt, SYSTEM_PROMPT_TEMPLATE, config, context);
            // Merge suggestions, keeping local ones first if they are highly relevant
            return {
              suggestions: [...suggestions, ...remoteResult.suggestions].slice(0, 5),
              latencyMs: remoteResult.latencyMs
            };
          }
        }
      } catch (e) {
        console.error("Remote analysis failed, falling back to local:", e);
      }

      return { suggestions };
    }

    case "AUTH_SIGN_IN":
      return await AuthManager.signIn(true);

    case "AUTH_SIGN_OUT":
      return await AuthManager.signOut();

    case "GET_AUTH_STATUS":
      return await AuthManager.getAuthStatus();

    default:
      console.warn("Unknown message type:", message.type);
      return null;
  }
}
