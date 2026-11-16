import { StorageManager } from "./storage";
import {
  isProviderConfigured,
  onDeviceAvailability,
  onDeviceStatusMessage,
  providers,
} from "@plenz/providers";
import { AuthSession } from "./auth-session";
import { PromptGalleryManager } from "./prompt-gallery";
import { Sites } from "./sites";
import {
  CONTENT_SCRIPT_RPC,
  type RpcFailure,
  type RpcPayload,
  type RpcReply,
  type RpcType,
} from "../shared/rpc";

function isExtensionPage(sender: chrome.runtime.MessageSender) {
  return (
    typeof sender.url === "string" &&
    sender.url.startsWith(chrome.runtime.getURL(""))
  );
}

type Handlers = {
  [K in RpcType]: (
    payload: RpcPayload<K>,
    sender: chrome.runtime.MessageSender,
  ) => Promise<RpcReply<K> | RpcFailure>;
};

// Payloads still cross a trust boundary, so handlers keep their runtime checks.
const handlers: Handlers = {
  async GET_ACTIVE_MODEL() {
    const configResult = await StorageManager.getActiveModelConfig();
    const prefs = await StorageManager.getPreferences();
    return {
      config: configResult.data,
      activeModelId: prefs.activeModelId,
      isConfigured: isProviderConfigured(
        providers.find((p) => p.id === prefs.activeProviderId),
        configResult.data,
      ),
      syncStatus: configResult.syncStatus,
      error: configResult.error,
    };
  },

  async SET_ACTIVE_MODEL(payload) {
    await StorageManager.setPreferences({
      activeModelId: payload.modelId,
      activeProviderId: payload.providerId,
    });
    return { success: true };
  },

  async GET_STORAGE_SETTINGS() {
    return StorageManager.getStorageSettings();
  },

  async GET_PREFERENCES() {
    return StorageManager.getPreferences();
  },

  async SET_PREFERENCES(payload) {
    await StorageManager.setPreferences(payload?.preferences ?? {});
    return { success: true, preferences: await StorageManager.getPreferences() };
  },

  async SET_STORAGE_BACKEND(payload) {
    const nextBackend = payload?.backend;

    if (nextBackend !== "chrome-sync" && nextBackend !== "firebase") {
      return {
        success: false,
        error: "Invalid storage backend.",
      };
    }

    await StorageManager.setStorageBackend(nextBackend);
    return { success: true };
  },

  async GET_MODEL_CONFIG(payload) {
    return StorageManager.getModelConfig(payload.providerId);
  },

  async SAVE_MODEL_CONFIG(payload) {
    return StorageManager.setModelConfig(payload.providerId, payload.config);
  },

  async GET_ALL_MODEL_CONFIGS() {
    return StorageManager.getAllModelConfigs();
  },

  async MIGRATE_SYNC_TO_FIREBASE() {
    return StorageManager.migrateSyncToFirebase();
  },

  async TEST_CONNECTION(payload) {
    const { providerId, config } = payload;
    const provider = providers.find((p) => p.id === providerId);
    if (!provider) throw new Error(`Provider ${providerId} not found`);
    return provider.testConnection(config);
  },

  async AUTH_SIGN_IN() {
    return AuthSession.signIn();
  },

  async AUTH_SIGN_OUT(payload) {
    return AuthSession.signOut(payload?.keepLocalCopies === true);
  },

  async GET_AUTH_STATE() {
    return AuthSession.getSnapshot();
  },

  async OPEN_PROMPT_GALLERY_PANEL(payload) {
    const windowId = payload?.windowId;

    if (typeof windowId !== "number") {
      return { success: false, error: "Current window is unavailable." };
    }

    await chrome.sidePanel.open({ windowId });
    return { success: true };
  },

  async LIST_PUBLIC_PROMPTS(payload) {
    return {
      prompts: await PromptGalleryManager.listPublicPrompts(
        payload?.category === "newest" ? "newest" : "trending",
      ),
    };
  },

  async LIST_SAVED_PROMPTS() {
    return {
      prompts: await PromptGalleryManager.listSavedPrompts(),
    };
  },

  async CREATE_SAVED_PROMPT(payload) {
    return {
      prompt: await PromptGalleryManager.createCustomPrompt({
        title: payload?.title ?? "",
        prompt: payload?.prompt ?? "",
      }),
    };
  },

  async UPDATE_SAVED_PROMPT(payload) {
    return {
      prompt: await PromptGalleryManager.updateSavedPrompt({
        id: payload?.id ?? "",
        title: payload?.title ?? "",
        prompt: payload?.prompt ?? "",
      }),
    };
  },

  async SAVE_PUBLIC_PROMPT(payload) {
    return {
      prompt: await PromptGalleryManager.savePublicPrompt(payload?.prompt),
    };
  },

  async DELETE_SAVED_PROMPT(payload) {
    await PromptGalleryManager.deleteSavedPrompt(payload?.id ?? "");
    return { success: true };
  },

  async GET_ON_DEVICE_STATUS() {
    // Checked here, where refines run, rather than in the asking page.
    const availability = await onDeviceAvailability();
    return { availability, message: onDeviceStatusMessage(availability) };
  },

  async GET_SITE_STATUS(payload) {
    return Sites.status(String(payload?.url ?? ""));
  },

  async SITE_PERMISSION_REQUESTED(payload) {
    const tabId = typeof payload?.tabId === "number" ? payload.tabId : undefined;
    return Sites.markPending(String(payload?.url ?? ""), tabId);
  },

  async ENABLE_SITE(payload) {
    const tabId = typeof payload?.tabId === "number" ? payload.tabId : undefined;
    return Sites.enable(String(payload?.url ?? ""), tabId);
  },

  async DISABLE_SITE(payload) {
    return Sites.disable(String(payload?.url ?? ""));
  },
};

function isRpcType(type: unknown): type is RpcType {
  return typeof type === "string" && Object.hasOwn(handlers, type);
}

export async function handleMessage(
  message: unknown,
  sender: chrome.runtime.MessageSender,
): Promise<unknown> {
  if (sender.id !== chrome.runtime.id) {
    return { error: "Unauthorized sender." };
  }

  const type = (message as { type?: unknown } | null)?.type;
  if (!isRpcType(type)) {
    console.warn("Unknown message type:", type);
    return null;
  }

  if (!isExtensionPage(sender) && !CONTENT_SCRIPT_RPC.has(type)) {
    console.warn("plenz: blocked message from content script:", type);
    return { error: "Not allowed from this context." };
  }

  const handler = handlers[type] as (
    payload: unknown,
    sender: chrome.runtime.MessageSender,
  ) => Promise<unknown>;
  return handler((message as { payload?: unknown }).payload, sender);
}
