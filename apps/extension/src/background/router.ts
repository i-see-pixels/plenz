import { StorageManager } from "./storage";
import { providers } from "@plenz/providers";
import { AuthSession } from "./auth-session";
import { PromptGalleryManager } from "./prompt-gallery";
import { analyzePromptWithOrchestration } from "./prompt-orchestrator";

// Content scripts run inside third-party pages, so they only get the calls they need.
const CONTENT_SCRIPT_MESSAGES = new Set([
  "ANALYZE_PROMPT",
  "CANCEL_ANALYSIS",
  "GET_PREFERENCES",
]);

const inFlightAnalyses = new Map<string, AbortController>();

function isExtensionPage(sender: chrome.runtime.MessageSender) {
  return (
    typeof sender.url === "string" &&
    sender.url.startsWith(chrome.runtime.getURL(""))
  );
}

function getAnalysisKey(sender: chrome.runtime.MessageSender) {
  return sender.tab?.id !== undefined
    ? `${sender.tab.id}:${sender.frameId ?? 0}`
    : "extension-page";
}

function cancelAnalysis(key: string) {
  inFlightAnalyses.get(key)?.abort();
  inFlightAnalyses.delete(key);
}

export async function handleMessage(
  message: any,
  sender: chrome.runtime.MessageSender,
) {
  if (sender.id !== chrome.runtime.id) {
    return { error: "Unauthorized sender." };
  }

  if (!isExtensionPage(sender) && !CONTENT_SCRIPT_MESSAGES.has(message?.type)) {
    console.warn("plenz: blocked message from content script:", message?.type);
    return { error: "Not allowed from this context." };
  }

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

    case "MIGRATE_SYNC_TO_FIREBASE":
      return await StorageManager.migrateSyncToFirebase();

    case "TEST_CONNECTION": {
      const { providerId, config } = message.payload;
      const provider = providers.find((p) => p.id === providerId);
      if (!provider) throw new Error(`Provider ${providerId} not found`);
      return await provider.testConnection(config);
    }

    case "ANALYZE_PROMPT": {
      const { prompt, context } = message.payload;
      const key = getAnalysisKey(sender);
      // A newer request from the same frame makes the previous one obsolete.
      cancelAnalysis(key);
      const controller = new AbortController();
      inFlightAnalyses.set(key, controller);

      try {
        return await analyzePromptWithOrchestration(
          prompt,
          context,
          controller.signal,
        );
      } catch (e: any) {
        console.error("Remote analysis failed:", e);
        return { error: e.message || "Failed to analyze prompt." };
      } finally {
        if (inFlightAnalyses.get(key) === controller) {
          inFlightAnalyses.delete(key);
        }
      }
    }

    case "CANCEL_ANALYSIS":
      cancelAnalysis(getAnalysisKey(sender));
      return { success: true };

    case "AUTH_SIGN_IN":
      return await AuthSession.signIn();

    case "AUTH_SIGN_OUT":
      return await AuthSession.signOut(message.payload?.keepLocalCopies === true);

    case "GET_AUTH_STATE":
      return await AuthSession.getSnapshot();

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

