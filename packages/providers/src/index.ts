import { AnthropicAdapter } from "./anthropic";
import { GoogleAdapter } from "./google";
import {
  OPENAI_COMPATIBLE_PRESETS,
  OpenAICompatibleAdapter,
} from "./openai-compatible";

export * from "./anthropic";
export * from "./google";
export * from "./openai-compatible";
export * from "./endpoints";
export * from "./sse";

function openAICompatible(id: string) {
  const preset = OPENAI_COMPATIBLE_PRESETS.find((p) => p.id === id);
  if (!preset) throw new Error(`Unknown OpenAI-compatible preset: ${id}`);
  return new OpenAICompatibleAdapter(preset);
}

// Three adapters; ids match what users already have saved, so stored
// configs keep working. Order is the order shown in settings.
export const providers = [
  openAICompatible("openai"),
  new GoogleAdapter(),
  new AnthropicAdapter(),
  openAICompatible("mistral"),
  openAICompatible("groq"),
  openAICompatible("openrouter"),
  openAICompatible("custom"),
];
