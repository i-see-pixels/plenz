import { StorageManager } from "./storage";
import { providers } from "@promptlens/providers";
import { SYSTEM_PROMPT_TEMPLATE } from "@promptlens/core";
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
      const { prompt } = message.payload;
      const config = await StorageManager.getActiveModelConfig();
      if (!config) throw new Error("No active model configured");

      // Find provider that supports this model
      const provider = providers.find((p) =>
        p.models.some((m) => m.id === config.model),
      );
      if (!provider)
        throw new Error(`Provider for model ${config.model} not found`);

      return await provider.analyze(prompt, SYSTEM_PROMPT_TEMPLATE, config);
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
