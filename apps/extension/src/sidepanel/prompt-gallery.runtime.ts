import type { PublicPrompt } from "@plenz/types";
import {
  isRpcFailure,
  type PayloadArgs,
  type RpcReply,
  type RpcType,
  sendRpc,
} from "../shared/rpc";

/** Like sendRpc, but an error reply rejects so callers can use try/catch. */
async function call<K extends RpcType>(
  type: K,
  ...args: PayloadArgs<K>
): Promise<RpcReply<K>> {
  const reply = await sendRpc(type, ...args);
  if (isRpcFailure(reply)) {
    throw new Error(reply.error);
  }
  return reply as RpcReply<K>;
}

export const promptGalleryRuntime = {
  createSavedPrompt(title: string, prompt: string) {
    return call("CREATE_SAVED_PROMPT", { title, prompt });
  },

  deleteSavedPrompt(id: string) {
    return call("DELETE_SAVED_PROMPT", { id });
  },

  listPublicPrompts(category: "trending" | "newest") {
    return call("LIST_PUBLIC_PROMPTS", { category });
  },

  listSavedPrompts() {
    return call("LIST_SAVED_PROMPTS");
  },

  updateSavedPrompt(id: string, title: string, prompt: string) {
    return call("UPDATE_SAVED_PROMPT", { id, title, prompt });
  },

  savePublicPrompt(prompt: PublicPrompt) {
    return call("SAVE_PUBLIC_PROMPT", { prompt });
  },
};
