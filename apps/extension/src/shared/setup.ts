import type { OnDeviceAvailability } from "@plenz/providers";

/** Where the welcome page lives, relative to the extension root. */
export const WELCOME_PAGE = "src/welcome/index.html";

/**
 * Whether refines can run, mirroring the orchestrator: a configured provider
 * first, else Chrome's on-device model when it's ready. `null` inputs are
 * still loading.
 */
export type SetupState = "checking" | "provider" | "on-device" | "needs-setup";

export function setupState(
  providerConfigured: boolean | null,
  onDevice: OnDeviceAvailability | null,
): SetupState {
  if (providerConfigured === true) return "provider";
  if (providerConfigured === null) return "checking";
  if (onDevice === "available") return "on-device";
  // A pending on-device check shouldn't flash "needs setup".
  if (onDevice === null) return "checking";
  return "needs-setup";
}

export const SETUP_MESSAGES: Record<Exclude<SetupState, "checking">, string> = {
  provider: "Ready. Refines use your AI provider.",
  "on-device":
    "Ready. Refines run on Chrome's built-in model; add a provider for stronger results.",
  "needs-setup": "Connect an AI provider so plenz can rewrite prompts. The prompt check already works.",
};
