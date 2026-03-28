import { StorageManager } from "./storage";
import { providers } from "@promptlens/providers";
import {
  buildSystemPrompt,
  IntentDetector,
  EntityExtractor,
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
        activeProviderId: message.payload.providerId,
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

      const intentDetector = new IntentDetector();
      const entityExtractor = new EntityExtractor();

      const intentMatch = intentDetector.detect(prompt);
      const entities = entityExtractor.extract(prompt, context);
      const systemPrompt = buildSystemPrompt(intentMatch, entities);

      try {
        const configResult = await StorageManager.getActiveModelConfig();
        const config = configResult.data;
        const prefs = await StorageManager.getPreferences();

        if (!config || !config.apiKey) {
          return {
            error:
              "LLM Provider not configured. Please set an API key in the extension options.",
          };
        }

        const provider = providers.find((p) => p.id === prefs.activeProviderId);
        if (!provider) {
          return {
            error:
              "Active LLM Provider not found. Please review your settings.",
          };
        }

        const remoteResult = await provider.analyze(
          prompt,
          systemPrompt,
          config,
          context,
        );
        return {
          suggestions: remoteResult.suggestions.slice(0, 5),
          latencyMs: remoteResult.latencyMs,
        };
      } catch (e: any) {
        console.error("Remote analysis failed:", e);
        return { error: e.message || "Failed to analyze prompt." };
      }
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
