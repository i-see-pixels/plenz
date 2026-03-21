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
      const configResult = await StorageManager.getActiveModelConfig();
      const prefs = await StorageManager.getPreferences();
      const response = {
        config: configResult.data,
        activeModelId: prefs.activeModelId,
        isConfigured: !!configResult.data?.apiKey,
        syncStatus: configResult.syncStatus,
        error: configResult.error,
      };
      return response;

    case "SET_ACTIVE_MODEL":
      await StorageManager.setPreferences({
        activeModelId: message.payload.modelId,
      });
      return { success: true };

    case "GET_STORAGE_SETTINGS":
      return await StorageManager.getStorageSettings();

    case "SET_STORAGE_BACKEND": {
      const nextBackend = message.payload?.backend;

      if (nextBackend !== "chrome-sync" && nextBackend !== "firebase") {
        return {
          success: false,
          error: "Invalid storage backend.",
        };
      }

      await StorageManager.setStorageBackend(nextBackend);
      return { success: true };
    }

    case "GET_MODEL_CONFIG":
      return await StorageManager.getModelConfig(message.payload.providerId);

    case "SAVE_MODEL_CONFIG":
      return await StorageManager.setModelConfig(
        message.payload.providerId,
        message.payload.config,
      );

    case "GET_ALL_MODEL_CONFIGS":
      return await StorageManager.getAllModelConfigs();

    case "MIGRATE_KEYS_TO_SYNC":
      return await StorageManager.migrateLocalToPreferredBackend();

    case "MIGRATE_SYNC_TO_FIREBASE":
      return await StorageManager.migrateSyncToFirebase();

    case "CACHE_MODEL_CONFIGS_LOCALLY":
      return await StorageManager.cacheSyncToLocal();

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
        const configResult = await StorageManager.getActiveModelConfig();
        const config = configResult.data;
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
