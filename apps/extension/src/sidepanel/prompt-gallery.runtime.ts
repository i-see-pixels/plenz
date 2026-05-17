import type { PublicPrompt, SavedPrompt } from "@plenz/types";
import type { UserInfo } from "../background/auth";

function sendRuntimeMessage<T>(message: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (
        response &&
        typeof response === "object" &&
        "error" in (response as { error?: unknown }) &&
        typeof (response as { error?: unknown }).error === "string"
      ) {
        reject(new Error((response as { error: string }).error));
        return;
      }

      resolve(response as T);
    });
  });
}

export const promptGalleryRuntime = {
  createSavedPrompt(title: string, prompt: string) {
    return sendRuntimeMessage<{ prompt: SavedPrompt }>({
      type: "CREATE_SAVED_PROMPT",
      payload: { title, prompt },
    });
  },

  deleteSavedPrompt(id: string) {
    return sendRuntimeMessage<{ success: boolean }>({
      type: "DELETE_SAVED_PROMPT",
      payload: { id },
    });
  },

  getAuthStatus() {
    return sendRuntimeMessage<UserInfo | null>({
      type: "GET_AUTH_STATUS",
    });
  },

  listPublicPrompts(category: "trending" | "newest") {
    return sendRuntimeMessage<{ prompts: PublicPrompt[] }>({
      type: "LIST_PUBLIC_PROMPTS",
      payload: { category },
    });
  },

  listSavedPrompts() {
    return sendRuntimeMessage<{ prompts: SavedPrompt[] }>({
      type: "LIST_SAVED_PROMPTS",
    });
  },

  updateSavedPrompt(id: string, title: string, prompt: string) {
    return sendRuntimeMessage<{ prompt: SavedPrompt }>({
      type: "UPDATE_SAVED_PROMPT",
      payload: { id, title, prompt },
    });
  },

  savePublicPrompt(prompt: PublicPrompt) {
    return sendRuntimeMessage<{ prompt: SavedPrompt }>({
      type: "SAVE_PUBLIC_PROMPT",
      payload: { prompt },
    });
  },
};
