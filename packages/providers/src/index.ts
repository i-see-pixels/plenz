import { OpenAIAdapter } from "./openai"
import { GoogleAdapter } from "./google"

export * from "./openai"
export * from "./google"

export const providers = [new OpenAIAdapter(), new GoogleAdapter()]
