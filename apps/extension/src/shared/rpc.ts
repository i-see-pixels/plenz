// The one contract between extension pages / content scripts and the
// background worker. Every message type, its payload and its reply live
// here, so senders and the router's handler table are checked against the
// same definitions.

import type {
  ConnectionTestResult,
  ProviderConfig,
  PublicPrompt,
  SavedPrompt,
  StorageResult,
  SyncStatus,
} from "@plenz/types";
import type { AuthSnapshot } from "../background/auth-machine";
import type { UserPreferences } from "../background/storage";
import type { StorageBackendPreference } from "../background/storage-backend";
import type { SiteStatus } from "./sites";
import type { VaultStatus } from "../background/sync-vault";
import type { OnDeviceAvailability } from "@plenz/providers";
import type { LearningEvent } from "./learning";

/** A prompt the in-page `/` command can insert (see ../content/slash.ts). */
export type InsertablePrompt = {
  id: string;
  title: string;
  text: string;
  source: "saved" | "gallery";
};

/** Any handler may reply with this instead (rejected sender, thrown error). */
export type RpcFailure = { error: string };

type Success = { success: true };
type ActionResult = { success: boolean; error?: string };
type MigrationResult = { migrated: number; errors: string[] };
/** `upgraded`: keys re-encrypted from the pre-passphrase format. */
type VaultResult = { success: boolean; error?: string; upgraded?: number };

export type RpcMap = {
  // Content scripts (also allowed from extension pages). Refines stream over
  // a port instead; see ./refine-port.ts.
  GET_PREFERENCES: { payload: void; reply: UserPreferences };
  /** Saved and gallery prompts for the `/` command (titles and text only). */
  LIST_INSERTABLE_PROMPTS: { payload: void; reply: { prompts: InsertablePrompt[] } };
  /** Local learning: a refine outcome or a sent draft (see ./learning.ts). */
  RECORD_LEARNING: { payload: LearningEvent; reply: Success };

  // Extension pages only
  SET_PREFERENCES: {
    payload: { preferences: Partial<UserPreferences> };
    reply: Success & { preferences: UserPreferences };
  };
  GET_ACTIVE_MODEL: {
    payload: void;
    reply: {
      config: ProviderConfig | null;
      activeModelId: string | null;
      isConfigured: boolean;
      syncStatus: SyncStatus;
      error?: string;
    };
  };
  SET_ACTIVE_MODEL: {
    payload: { modelId: string; providerId: string };
    reply: Success;
  };
  GET_STORAGE_SETTINGS: {
    payload: void;
    reply: { storageBackend: StorageBackendPreference; firebaseConfigured: boolean };
  };
  SET_STORAGE_BACKEND: {
    payload: { backend: StorageBackendPreference };
    reply: ActionResult;
  };
  GET_MODEL_CONFIG: {
    payload: { providerId: string };
    reply: StorageResult<ProviderConfig>;
  };
  SAVE_MODEL_CONFIG: {
    payload: { providerId: string; config: ProviderConfig };
    reply: StorageResult<void>;
  };
  GET_ALL_MODEL_CONFIGS: {
    payload: void;
    reply: StorageResult<Record<string, ProviderConfig>>;
  };
  MIGRATE_SYNC_TO_FIREBASE: { payload: void; reply: MigrationResult };
  TEST_CONNECTION: {
    payload: { providerId: string; config: ProviderConfig };
    reply: ConnectionTestResult;
  };
  AUTH_SIGN_IN: { payload: void; reply: AuthSnapshot };
  AUTH_SIGN_OUT: { payload: { keepLocalCopies: boolean }; reply: AuthSnapshot };
  GET_AUTH_STATE: { payload: void; reply: AuthSnapshot };
  OPEN_PROMPT_GALLERY_PANEL: { payload: { windowId: number }; reply: ActionResult };
  LIST_PUBLIC_PROMPTS: {
    payload: { category: "trending" | "newest" };
    reply: { prompts: PublicPrompt[] };
  };
  LIST_SAVED_PROMPTS: { payload: void; reply: { prompts: SavedPrompt[] } };
  CREATE_SAVED_PROMPT: {
    payload: { title: string; prompt: string };
    reply: { prompt: SavedPrompt };
  };
  UPDATE_SAVED_PROMPT: {
    payload: { id: string; title: string; prompt: string };
    reply: { prompt: SavedPrompt };
  };
  SAVE_PUBLIC_PROMPT: { payload: { prompt: PublicPrompt }; reply: { prompt: SavedPrompt } };
  DELETE_SAVED_PROMPT: { payload: { id: string }; reply: Success };
  // Cloud Sync passphrase (end-to-end encryption of synced API keys).
  GET_SYNC_VAULT_STATUS: { payload: void; reply: { status: VaultStatus } };
  SET_UP_SYNC_VAULT: { payload: { passphrase: string }; reply: VaultResult };
  UNLOCK_SYNC_VAULT: { payload: { passphrase: string }; reply: VaultResult };
  CHANGE_SYNC_PASSPHRASE: { payload: { current: string; next: string }; reply: VaultResult };
  LOCK_SYNC_VAULT: { payload: void; reply: VaultResult };
  RESET_SYNC_VAULT: { payload: void; reply: VaultResult };
  /** Chrome's built-in model, as seen from the background worker. */
  GET_ON_DEVICE_STATUS: {
    payload: void;
    reply: { availability: OnDeviceAvailability; message: string };
  };
  // Sites beyond the built-in chat platforms (see ./sites.ts).
  GET_SITE_STATUS: { payload: { url: string }; reply: { status: SiteStatus; host?: string } };
  /** Call just before asking Chrome for the site's permission. */
  SITE_PERMISSION_REQUESTED: { payload: { url: string; tabId?: number }; reply: ActionResult };
  /** Call after the popup was granted the site's host permission. */
  ENABLE_SITE: { payload: { url: string; tabId?: number }; reply: ActionResult };
  DISABLE_SITE: { payload: { url: string }; reply: ActionResult };
  /** Forget what plenz learned locally. */
  RESET_LEARNING: { payload: void; reply: Success };
};

export type RpcType = keyof RpcMap;
export type RpcPayload<K extends RpcType> = RpcMap[K]["payload"];
export type RpcReply<K extends RpcType> = RpcMap[K]["reply"];

export type RpcMessage = {
  [K in RpcType]: RpcPayload<K> extends void
    ? { type: K; payload?: undefined }
    : { type: K; payload: RpcPayload<K> };
}[RpcType];

/**
 * Content scripts run inside third-party pages, so they may only call these.
 * Keys and configs stay out of reach of a compromised page.
 */
export const CONTENT_SCRIPT_RPC: ReadonlySet<RpcType> = new Set<RpcType>([
  "GET_PREFERENCES",
  "LIST_INSERTABLE_PROMPTS",
  "RECORD_LEARNING",
]);

export type PayloadArgs<K extends RpcType> = RpcPayload<K> extends void
  ? []
  : [payload: RpcPayload<K>];

/** Send a typed request to the background worker. */
export function sendRpc<K extends RpcType>(
  type: K,
  ...args: PayloadArgs<K>
): Promise<RpcReply<K> | RpcFailure> {
  return chrome.runtime.sendMessage({ type, payload: args[0] });
}

export function isRpcFailure(value: unknown): value is RpcFailure {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as RpcFailure).error === "string"
  );
}

/** Background → extension pages. */
export type BroadcastMessage = { type: "AUTH_STATE_CHANGED"; payload: AuthSnapshot };
