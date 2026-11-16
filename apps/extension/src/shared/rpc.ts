// The one contract between extension pages / content scripts and the
// background worker. Every message type, its payload and its reply live
// here, so senders and the router's handler table are checked against the
// same definitions.

import type {
  AnalysisResult,
  ConnectionTestResult,
  ProviderAnalyzeContext,
  ProviderConfig,
  PublicPrompt,
  SavedPrompt,
  StorageResult,
  SyncStatus,
} from "@plenz/types";
import type { AuthSnapshot } from "../background/auth-machine";
import type { UserPreferences } from "../background/storage";
import type { StorageBackendPreference } from "../background/storage-backend";

/** Any handler may reply with this instead (rejected sender, thrown error). */
export type RpcFailure = { error: string };

export type AnalyzeReply =
  | (Pick<AnalysisResult, "suggestions" | "latencyMs"> & { providerId: string })
  | { error: string; cancelled?: boolean };

type Success = { success: true };
type ActionResult = { success: boolean; error?: string };
type MigrationResult = { migrated: number; errors: string[] };

export type RpcMap = {
  // Content scripts (also allowed from extension pages)
  ANALYZE_PROMPT: {
    payload: { prompt: string; context?: ProviderAnalyzeContext };
    reply: AnalyzeReply;
  };
  CANCEL_ANALYSIS: { payload: void; reply: Success };
  GET_PREFERENCES: { payload: void; reply: UserPreferences };

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
  "ANALYZE_PROMPT",
  "CANCEL_ANALYSIS",
  "GET_PREFERENCES",
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
