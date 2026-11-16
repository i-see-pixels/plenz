import { genericAdapter } from "./editors/generic";
import { findPlatformAdapter } from "./editors/platforms";
import type { EditorAdapter } from "./editors/types";
import { BadgeIndicator } from "./ui/BadgeIndicator";
import { RefinePanel } from "./ui/RefinePanel";
import {
  createContentModel,
  keyToEvent,
  transition,
  view,
  type ContentEffect,
  type ContentEvent,
  type ContentModel,
  type BadgeView,
  type ContentView,
  type LintSummary,
} from "./machine";
import {
  applyDiff,
  buildConversationContext,
  diffPrompts,
  lintPrompt,
  type PromptDiff,
} from "@plenz/core";
import {
  MAX_REFINE_DRAFT_CHARS,
  REFINE_PORT,
  type RefineServerMessage,
  type RefineStart,
} from "../shared/refine-port";
import {
  isRpcFailure,
  sendRpc,
  type PayloadArgs,
  type RpcFailure,
  type RpcReply,
  type RpcType,
} from "../shared/rpc";
import type { ConversationContext } from "@plenz/types";

const PREFERENCES_STORAGE_KEY = "preferences";
const DEFAULT_DEBOUNCE_MS = 500;

type Preferences = {
  debounceMs?: number;
  debounceTime?: number;
  suggestionsEnabled?: boolean;
  chatContextEnabled?: boolean;
  autoRefineEnabled?: boolean;
};

function sanitizeDebounceMs(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_DEBOUNCE_MS;
  }

  return Math.max(0, Math.min(5000, Math.round(value)));
}

function sameBadge(a: BadgeView, b: BadgeView) {
  if (a.kind !== b.kind) return false;
  if (a.kind === "error" && b.kind === "error") return a.message === b.message;
  if (a.kind === "lint" && b.kind === "lint") {
    return (
      a.score === b.score &&
      a.canUndo === b.canUndo &&
      a.findings.map((f) => f.label).join("|") ===
        b.findings.map((f) => f.label).join("|")
    );
  }
  return true;
}

/**
 * Driver for the content-script state machine (see ./machine.ts).
 * It turns DOM and runtime activity into machine events, runs the effects
 * each transition returns, and renders the badge and refine panel from the
 * current state.
 */
class ExtensionContentScript {
  private adapter: EditorAdapter | null = null;
  private inputElement: HTMLElement | null = null;
  private panel: RefinePanel | null = null;
  private refinePort: chrome.runtime.Port | null = null;
  private badge: BadgeIndicator | null = null;
  private runtimeUnavailableLogged = false;
  private domObserver: MutationObserver | null = null;
  private readonly boundHandleInput = this.handleInput.bind(this);
  private debounceTimer: number | null = null;
  private chatContextEnabled = false;
  private detectScheduled = false;
  private rollingSummary = "";
  private conversationUrl = window.location.href;

  private model: ContentModel = createContentModel();
  private renderedView: ContentView | null = null;
  private readonly eventQueue: ContentEvent[] = [];
  private dispatching = false;
  private lintCache: { text: string; result: LintSummary } | null = null;
  private diffCache: { original: string; output: string; diff: PromptDiff } | null = null;

  constructor() {
    // The manifest only injects on known chat sites; anywhere else we were
    // registered because the user enabled this site from the popup.
    this.adapter = findPlatformAdapter(window.location.hostname) ?? genericAdapter;
    void this.init();
  }

  private async init() {
    await this.loadPreferences();
    this.observePreferenceChanges();
    this.observeDOM();
    this.detectInput();

    document.addEventListener(
      "keydown",
      this.handleGlobalKeydown.bind(this),
      true,
    );

    // On other sites the prompt field is whichever text box the user focuses.
    if (this.adapter === genericAdapter) {
      document.addEventListener("focusin", () => this.detectInput(), true);
    }
  }

  /**
   * Events raised while effects run (for example the input event our own
   * write fires) are queued and processed in order after the current one.
   */
  private dispatch(event: ContentEvent) {
    this.eventQueue.push(event);
    if (this.dispatching) return;

    this.dispatching = true;
    try {
      let next: ContentEvent | undefined;
      while ((next = this.eventQueue.shift())) {
        const { model, effects } = transition(this.model, next);
        this.model = model;
        for (const effect of effects) this.runEffect(effect);
        this.render();
      }
    } finally {
      this.dispatching = false;
    }
  }

  private runEffect(effect: ContentEffect) {
    switch (effect.type) {
      case "startDebounce":
        this.debounceTimer = window.setTimeout(() => {
          this.debounceTimer = null;
          this.dispatch({ type: "DEBOUNCE_ELAPSED" });
        }, effect.ms);
        return;
      case "clearDebounce":
        if (this.debounceTimer) window.clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
        return;
      case "startRefine":
        this.startRefine(effect);
        return;
      case "cancelRefine":
        this.cancelRefine();
        return;
      case "applyResult": {
        const text =
          effect.rejected.length > 0
            ? applyDiff(this.diffFor(effect.original, effect.output), effect.rejected)
            : effect.output;
        this.writeInput(text);
        this.dispatch({ type: "APPLIED", text });
        return;
      }
      case "applyText":
        this.writeInput(effect.text);
        this.dispatch({ type: "APPLIED", text: effect.text });
        return;
    }
  }

  /** Lint once per distinct draft; render runs on every event. */
  private lintFor(text: string): LintSummary {
    if (this.lintCache?.text !== text) {
      this.lintCache = { text, result: lintPrompt(text) };
    }
    return this.lintCache.result;
  }

  /** Diff once per (draft, result) pair; the panel re-renders on every toggle. */
  private diffFor(original: string, output: string): PromptDiff {
    const cache = this.diffCache;
    if (cache?.original !== original || cache.output !== output) {
      this.diffCache = { original, output, diff: diffPrompts(original, output) };
    }
    return this.diffCache!.diff;
  }

  private render() {
    const next = view(this.model, this.lintFor(this.model.text));
    const prev = this.renderedView;
    this.renderedView = next;

    if (!prev || !sameBadge(prev.badge, next.badge)) {
      const badge = next.badge;
      if (badge.kind === "hidden") this.badge?.hide();
      else if (badge.kind === "saving") this.badge?.showSaving();
      else if (badge.kind === "ready") this.badge?.showReady();
      else if (badge.kind === "lint") {
        this.badge?.showLint(badge.score, badge.findings, badge.canUndo);
      }
      else this.badge?.showError(badge.message || "An error occurred");
    }

    // The panel updates in place (streamed text, answers keep focus).
    if (next.panel || prev?.panel) {
      const diff =
        next.panel?.kind === "result"
          ? this.diffFor(next.panel.original, next.panel.output)
          : null;
      this.panel?.render(next.panel, diff);
    }
  }

  private observeDOM() {
    // Chat pages mutate constantly while streaming; check at most every 250ms.
    this.domObserver = new MutationObserver(() => {
      if (this.detectScheduled) return;
      this.detectScheduled = true;
      window.setTimeout(() => {
        this.detectScheduled = false;

        if (!this.inputElement?.isConnected) {
          this.detachInput();
        }

        if (!this.inputElement) {
          this.detectInput();
        }
      }, 250);
    });
    this.domObserver.observe(document.body, { childList: true, subtree: true });
  }

  private async loadPreferences() {
    try {
      const reply = await this.sendRuntimeMessage("GET_PREFERENCES");
      const runtimePreferences = reply && !isRpcFailure(reply) ? reply : null;
      const stored = await chrome.storage.local.get(PREFERENCES_STORAGE_KEY);
      const localPreferences = stored[PREFERENCES_STORAGE_KEY] as
        | Preferences
        | undefined;
      const preferences = runtimePreferences ?? localPreferences;
      this.applyPreferences(preferences);
    } catch (error) {
      console.warn("plenz: failed to load preferences", error);
      this.applyPreferences(undefined);
    }
  }

  private observePreferenceChanges() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local" || !changes[PREFERENCES_STORAGE_KEY]) {
        return;
      }

      const updatedPreferences = changes[PREFERENCES_STORAGE_KEY].newValue as
        | Preferences
        | undefined;
      this.applyPreferences(updatedPreferences);
    });
  }

  private applyPreferences(preferences: Preferences | undefined) {
    this.chatContextEnabled = preferences?.chatContextEnabled === true;
    this.dispatch({
      type: "PREFERENCES_CHANGED",
      enabled: preferences?.suggestionsEnabled !== false,
      debounceMs: sanitizeDebounceMs(
        preferences?.debounceMs ?? preferences?.debounceTime,
      ),
      autoRefine: preferences?.autoRefineEnabled === true,
    });
  }

  private detachInput() {
    if (this.inputElement) {
      this.inputElement.removeEventListener("input", this.boundHandleInput);
    }

    this.dispatch({ type: "INPUT_DETACHED" });
    this.inputElement = null;
    this.panel?.destroy();
    this.badge?.destroy();
    this.panel = null;
    this.badge = null;
    this.renderedView = null;
  }

  private detectInput() {
    if (!this.adapter) return;

    const el = this.adapter.findInput(document);
    if (!el || this.inputElement === el) return;

    this.detachInput();

    const container = this.adapter.anchorFor(el);
    this.inputElement = el;
    this.panel = new RefinePanel(container, {
      onMode: (mode) => this.dispatch({ type: "MODE_CHOSEN", mode }),
      onAccept: () => this.dispatch({ type: "ACCEPT" }),
      onDismiss: () => this.dispatch({ type: "DISMISS" }),
      onAnswer: (index, value) =>
        this.dispatch({ type: "ANSWER_CHANGED", index, value }),
      onSubmitAnswers: () => this.dispatch({ type: "ANSWERS_SUBMITTED" }),
      onToggleChange: (index) => this.dispatch({ type: "CHANGE_TOGGLED", index }),
      onResetChanges: () => this.dispatch({ type: "CHANGES_RESET" }),
    });
    this.badge = new BadgeIndicator(container);
    this.badge.setOnClick(() => this.dispatch({ type: "BADGE_CLICKED" }));
    this.badge.setOnUndo(() => this.dispatch({ type: "UNDO_REQUESTED" }));
    el.addEventListener("input", this.boundHandleInput);

    this.dispatch({ type: "INPUT_ATTACHED" });
  }

  private handleInput() {
    if (!this.inputElement || !this.adapter) return;
    this.dispatch({ type: "TEXT_CHANGED", text: this.adapter.read(this.inputElement) });
  }

  /** One port per refine; disconnecting it cancels the provider call. */
  private startRefine(effect: Extract<ContentEffect, { type: "startRefine" }>) {
    this.cancelRefine();
    const { requestId } = effect;
    const fail = (message: string) =>
      this.dispatch({ type: "REFINE_FAILED", requestId, message });

    if (effect.text.length > MAX_REFINE_DRAFT_CHARS) {
      fail(
        `This draft is too long to refine (limit ${MAX_REFINE_DRAFT_CHARS.toLocaleString()} characters).`,
      );
      return;
    }
    if (!globalThis.chrome?.runtime?.id) {
      fail("plenz was updated or reloaded. Refresh this page to keep using it.");
      return;
    }

    const port = chrome.runtime.connect({ name: REFINE_PORT });
    this.refinePort = port;
    let settled = false;
    const settle = () => {
      settled = true;
      if (this.refinePort === port) this.refinePort = null;
      port.disconnect();
    };

    port.onMessage.addListener((message: RefineServerMessage) => {
      switch (message.type) {
        case "DELTA":
          this.dispatch({ type: "REFINE_DELTA", requestId, text: message.text });
          return;
        case "DONE":
          settle();
          this.dispatch({ type: "REFINE_DONE", requestId, text: message.text });
          return;
        case "QUESTIONS":
          settle();
          this.dispatch({ type: "QUESTIONS_READY", requestId, questions: message.questions });
          return;
        case "ERROR":
          settle();
          fail(message.message);
          return;
      }
    });
    // Our own disconnect() doesn't fire this; only an unexpected drop does.
    port.onDisconnect.addListener(() => {
      if (settled) return;
      settled = true;
      if (this.refinePort === port) this.refinePort = null;
      fail("Lost the connection to plenz. Try again.");
    });

    const lint = this.lintFor(effect.text);
    const start: RefineStart = {
      type: "START",
      step: effect.step,
      draft: effect.text,
      context: {
        active_website: window.location.hostname,
        conversation: this.chatContextEnabled
          ? this.collectConversationContext(effect.text)
          : undefined,
      },
      missing:
        effect.step === "improve" && lint.assessed
          ? lint.findings.map((finding) => finding.label)
          : undefined,
      answers: effect.answers,
    };
    port.postMessage(start);
  }

  private cancelRefine() {
    const port = this.refinePort;
    this.refinePort = null;
    port?.disconnect();
  }

  private collectConversationContext(
    currentDraft: string,
  ): ConversationContext | undefined {
    if (!this.adapter) return undefined;

    if (this.conversationUrl !== window.location.href) {
      this.conversationUrl = window.location.href;
      this.rollingSummary = "";
    }

    const messages = this.adapter.readMessages(document, this.inputElement);
    const conversation = buildConversationContext({
      platform: this.adapter.name,
      activeWebsite: window.location.hostname,
      currentDraft,
      messages,
      previousSummary: this.rollingSummary,
    });

    this.rollingSummary = conversation.rollingSummary ?? "";

    return conversation.recentMessages.length > 0 || conversation.rollingSummary
      ? conversation
      : undefined;
  }

  private async sendRuntimeMessage<K extends RpcType>(
    type: K,
    ...args: PayloadArgs<K>
  ): Promise<RpcReply<K> | RpcFailure | null> {
    const runtime = globalThis.chrome?.runtime;
    if (!runtime?.id || typeof runtime.sendMessage !== "function") {
      if (!this.runtimeUnavailableLogged) {
        console.warn(
          "plenz: extension runtime is unavailable. Reload the extension and page.",
        );
        this.runtimeUnavailableLogged = true;
      }
      return null;
    }

    return sendRpc(type, ...args);
  }

  private handleGlobalKeydown(e: KeyboardEvent) {
    const target = e.target as Node | null;
    const event = keyToEvent(this.model.state, {
      key: e.key,
      shiftKey: e.shiftKey,
      modKey: e.ctrlKey || e.metaKey,
      inInput: !!(target && this.inputElement?.contains(target)),
    });
    if (!event) return;

    e.preventDefault();
    e.stopPropagation();
    this.dispatch(event);
  }

  /** Through the editor's own input path where possible, so the page's undo keeps working. */
  private writeInput(text: string) {
    if (!this.inputElement || !this.adapter) return;
    this.adapter.write(this.inputElement, text);
  }
}

// Enabling a site injects into the open tab and registers for future loads;
// never run two copies in the same page.
const loaded = globalThis as typeof globalThis & { __plenzContentScript?: boolean };
if (!loaded.__plenzContentScript) {
  loaded.__plenzContentScript = true;
  new ExtensionContentScript();
}
