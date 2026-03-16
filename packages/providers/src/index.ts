import { OpenAIAdapter } from "./openai";
import { GoogleAdapter } from "./google";
import { AnthropicAdapter } from "./anthropic";
import { MistralAdapter } from "./mistral";
import { GroqAdapter } from "./groq";
import { OpenRouterAdapter } from "./openrouter";
import { CustomAdapter } from "./custom";

export * from "./openai";
export * from "./google";
export * from "./anthropic";
export * from "./mistral";
export * from "./groq";
export * from "./openrouter";
export * from "./custom";

export const providers = [
  new OpenAIAdapter(),
  new GoogleAdapter(),
  new AnthropicAdapter(),
  new MistralAdapter(),
  new GroqAdapter(),
  new OpenRouterAdapter(),
  new CustomAdapter(),
];
