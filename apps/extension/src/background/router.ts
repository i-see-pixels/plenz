import { StorageManager } from "./storage";
import { providers } from "@plenz/providers";
import { AuthManager } from "./auth";
import { PromptGalleryManager } from "./prompt-gallery";
import { analyzePromptWithOrchestration } from "./prompt-orchestrator";

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

    case "GET_PREFERENCES":
      return await StorageManager.getPreferences();

    case "SET_PREFERENCES":
      await StorageManager.setPreferences(message.payload?.preferences ?? {});
      return { success: true, preferences: await StorageManager.getPreferences() };

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

      try {
        return await analyzePromptWithOrchestration(prompt, context);
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

    case "OPEN_PROMPT_GALLERY_PANEL": {
      const windowId = message.payload?.windowId;

      if (typeof windowId !== "number") {
        return { success: false, error: "Current window is unavailable." };
      }

      await chrome.sidePanel.open({ windowId });
      return { success: true };
    }

    case "LIST_PUBLIC_PROMPTS":
      return {
        prompts: await PromptGalleryManager.listPublicPrompts(
          message.payload?.category === "newest" ? "newest" : "trending",
        ),
      };

    case "LIST_SAVED_PROMPTS":
      return {
        prompts: await PromptGalleryManager.listSavedPrompts(),
      };

    case "CREATE_SAVED_PROMPT":
      return {
        prompt: await PromptGalleryManager.createCustomPrompt({
          title: message.payload?.title ?? "",
          prompt: message.payload?.prompt ?? "",
        }),
      };

    case "UPDATE_SAVED_PROMPT":
      return {
        prompt: await PromptGalleryManager.updateSavedPrompt({
          id: message.payload?.id ?? "",
          title: message.payload?.title ?? "",
          prompt: message.payload?.prompt ?? "",
        }),
      };

    case "SAVE_PUBLIC_PROMPT":
      return {
        prompt: await PromptGalleryManager.savePublicPrompt(message.payload?.prompt),
      };

    case "DELETE_SAVED_PROMPT":
      await PromptGalleryManager.deleteSavedPrompt(message.payload?.id ?? "");
      return { success: true };

    default:
      console.warn("Unknown message type:", message.type);
      return null;
  }
}

