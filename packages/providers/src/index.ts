import { AnthropicAdapter } from "./anthropic";
import { GoogleAdapter } from "./google";
import { OnDeviceAdapter } from "./on-device";
import type { ProviderAdapter, ProviderConfig } from "@plenz/types";
import {
  OPENAI_COMPATIBLE_PRESETS,
  OpenAICompatibleAdapter,
} from "./openai-compatible";

export * from "./anthropic";
export * from "./google";
export * from "./openai-compatible";
export * from "./endpoints";
export * from "./sse";
export * from "./on-device";

function openAICompatible(id: string) {
  const preset = OPENAI_COMPATIBLE_PRESETS.find((p) => p.id === id);
  if (!preset) throw new Error(`Unknown OpenAI-compatible preset: ${id}`);
  return new OpenAICompatibleAdapter(preset);
}

// Three API adapters plus Chrome's on-device model; ids match what users
// already have saved, so stored configs keep working. Order is the order
// shown in settings.
export const providers = [
  openAICompatible("openai"),
  new GoogleAdapter(),
  new AnthropicAdapter(),
  openAICompatible("mistral"),
  openAICompatible("groq"),
  openAICompatible("openrouter"),
  openAICompatible("custom"),
  new OnDeviceAdapter(),
];

/** A provider can run when it has a model, plus a key if it needs one. */
export function isProviderConfigured(
  provider: ProviderAdapter | undefined,
  config: ProviderConfig | null | undefined,
) {
  return !!provider && !!config?.model && (provider.needsApiKey === false || !!config.apiKey);
}
