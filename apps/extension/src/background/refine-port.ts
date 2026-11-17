import { runRefine } from "./prompt-orchestrator";
import {
  isRefineStart,
  REFINE_PORT,
  type RefineServerMessage,
} from "../shared/refine-port";

/**
 * One port per refine: START in, DELTA chunks out, then one final message.
 * If the page closes the port first (typing, Esc, navigation), the provider
 * request is aborted.
 */
export function handleRefinePort(port: chrome.runtime.Port) {
  if (port.name !== REFINE_PORT) return;
  if (port.sender?.id !== chrome.runtime.id) {
    port.disconnect();
    return;
  }

  const controller = new AbortController();
  let finished = false;
  port.onDisconnect.addListener(() => {
    if (!finished) controller.abort();
  });

  const send = (message: RefineServerMessage) => {
    try {
      port.postMessage(message);
    } catch {
      // The page went away; the abort above already stopped the request.
    }
  };

  const onStart = async (message: unknown) => {
    port.onMessage.removeListener(onStart);

    if (!isRefineStart(message)) {
      finished = true;
      send({ type: "ERROR", message: "Invalid refine request." });
      port.disconnect();
      return;
    }

    const outcome = await runRefine(message, {
      signal: controller.signal,
      onDelta: (text) => send({ type: "DELTA", text }),
    });
    finished = true;
    if (controller.signal.aborted) return;

    if (outcome.kind === "text") {
      send({ type: "DONE", text: outcome.text, providerId: outcome.providerId });
    } else if (outcome.kind === "questions") {
      send({ type: "QUESTIONS", questions: outcome.questions, providerId: outcome.providerId });
    } else {
      const { message: text, detail, fixInSettings } = outcome.failure;
      send({ type: "ERROR", message: text, detail, fixInSettings });
    }
    port.disconnect();
  };

  port.onMessage.addListener(onStart);
}
