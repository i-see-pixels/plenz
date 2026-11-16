import { getActivePlatform, PlatformConfig } from "./platforms/registry";
import { SuggestionOverlay } from "./ui/SuggestionOverlay";
import { BadgeIndicator } from "./ui/BadgeIndicator";
import { GhostOverlay } from "./ui/GhostOverlay";
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
import { lintPrompt } from "@plenz/core";
import {
  isRpcFailure,
  sendRpc,
  type PayloadArgs,
  type RpcFailure,
  type RpcReply,
  type RpcType,
} from "../shared/rpc";
import { buildConversationContext } from "@plenz/core";
import type { ChatMessage, ConversationContext } from "@plenz/types";

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
  if (a.kind === "count" && b.kind === "count") return a.count === b.count;
  if (a.kind === "error" && b.kind === "error") return a.message === b.message;
  if (a.kind === "lint" && b.kind === "lint") {
    return (
      a.score === b.score &&
      a.findings.map((f) => f.label).join("|") ===
        b.findings.map((f) => f.label).join("|")
    );
  }
  return true;
}

/**
 * Driver for the content-script state machine (see ./machine.ts).
 * It turns DOM and runtime activity into machine events, runs the effects
 * each transition returns, and renders the badge, popover and ghost text
 * from the current state.
 */
class ExtensionContentScript {
  private platform: PlatformConfig | null = null;
  private inputElement: HTMLElement | null = null;
  private overlay: SuggestionOverlay | null = null;
  private ghostOverlay: GhostOverlay | null = null;
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

  constructor() {
    this.platform = getActivePlatform();
    if (this.platform) {
      void this.init();
    }
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
      case "requestAnalysis":
        void this.requestAnalysis(effect.text, effect.requestId);
        return;
      case "cancelAnalysis":
        void this.sendRuntimeMessage("CANCEL_ANALYSIS").catch(
          () => {},
        );
        return;
      case "applyText":
        this.writeInput(effect.text);
        this.dispatch({ type: "APPLIED" });
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

  private render() {
    const next = view(this.model, this.lintFor(this.model.text));
    const prev = this.renderedView;
    this.renderedView = next;

    if (!prev || !sameBadge(prev.badge, next.badge)) {
      const badge = next.badge;
      if (badge.kind === "hidden") this.badge?.hide();
      else if (badge.kind === "saving") this.badge?.showSaving();
      else if (badge.kind === "count") this.badge?.show(badge.count);
      else if (badge.kind === "lint") this.badge?.showLint(badge.score, badge.findings);
      else this.badge?.showError(badge.message || "An error occurred");
    }

    if (!next.overlay) {
      if (this.overlay?.isVisible()) this.overlay.hide();
    } else if (
      !this.overlay?.isVisible() ||
      prev?.overlay?.suggestions !== next.overlay.suggestions
    ) {
      this.overlay?.show(next.overlay.suggestions);
      this.overlay?.setActiveIndex(next.overlay.activeIndex);
    } else if (prev?.overlay?.activeIndex !== next.overlay.activeIndex) {
      this.overlay.setActiveIndex(next.overlay.activeIndex);
    }

    if (!next.ghost) {
      this.ghostOverlay?.hide();
    } else if (
      prev?.ghost?.text !== next.ghost.text ||
      prev?.ghost?.suggestion !== next.ghost.suggestion
    ) {
      this.ghostOverlay?.update(next.ghost.text, next.ghost.suggestion);
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
    this.overlay?.destroy();
    this.badge?.destroy();
    this.ghostOverlay?.destroy();
    this.overlay = null;
    this.badge = null;
    this.ghostOverlay = null;
    this.renderedView = null;
  }

  private detectInput() {
    if (!this.platform) return;

    for (const selector of this.platform.inputSelectors) {
      const el = document.querySelector(selector) as HTMLElement;
      if (el) {
        if (this.inputElement === el) {
          return;
        }

        this.detachInput();

        // Determine container for overlay (usually parent of input)
        const container = el.parentElement || el;
        this.inputElement = el;
        this.overlay = new SuggestionOverlay(container);
        this.ghostOverlay = new GhostOverlay(el);
        this.badge = new BadgeIndicator(container);
        this.overlay.setOnSelect((index) =>
          this.dispatch({ type: "SELECT", index }),
        );
        this.overlay.setOnClose(() => this.dispatch({ type: "DISMISS" }));
        this.badge.setOnClick(() => this.dispatch({ type: "BADGE_CLICKED" }));
        el.addEventListener("input", this.boundHandleInput);

        this.dispatch({ type: "INPUT_ATTACHED" });
        break;
      }
    }
  }

  private handleInput(e: Event) {
    const target = e.target as HTMLElement;
    const text = (target as any).value || target.innerText || "";
    this.dispatch({ type: "TEXT_CHANGED", text });
  }

  private async requestAnalysis(text: string, requestId: number) {
    const conversation = this.chatContextEnabled
      ? this.collectConversationContext(text)
      : undefined;

    try {
      const response = await this.sendRuntimeMessage("ANALYZE_PROMPT", {
        prompt: text,
        context: {
          active_website: window.location.hostname,
          conversation,
        },
      });

      if (response && "error" in response) {
        throw new Error(response.error);
      }

      this.dispatch({
        type: "ANALYSIS_SUCCEEDED",
        requestId,
        suggestions: response?.suggestions ?? [],
      });
    } catch (error) {
      // The machine drops superseded responses, so only log the current one.
      const { state } = this.model;
      if (state.kind === "analyzing" && state.requestId === requestId) {
        console.error("plenz Analysis Error:", error);
      }
      this.dispatch({
        type: "ANALYSIS_FAILED",
        requestId,
        message: (error as Error).message || "An error occurred",
      });
    }
  }

  private getElementVisibleText(element: Element) {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return "";
    return (element.textContent || "").replace(/\s+/g, " ").trim();
  }

  private collectRawChatMessages() {
    if (!this.platform) return [];

    const entries: Array<ChatMessage & { element: Element }> = [];
    const seenElements = new Set<Element>();

    for (const { selector, role } of this.platform.messageSelectors) {
      for (const element of Array.from(document.querySelectorAll(selector))) {
        if (seenElements.has(element) || element === this.inputElement) continue;
        seenElements.add(element);

        const text = this.getElementVisibleText(element);
        if (!text) continue;

        entries.push({
          role,
          text,
          timestamp: Date.now(),
          element,
        });
      }
    }

    return entries
      .sort((a, b) =>
        a.element.compareDocumentPosition(b.element) &
        Node.DOCUMENT_POSITION_PRECEDING
          ? 1
          : -1,
      )
      .map(({ element, ...message }) => message);
  }

  private collectConversationContext(
    currentDraft: string,
  ): ConversationContext | undefined {
    if (!this.platform) return undefined;

    if (this.conversationUrl !== window.location.href) {
      this.conversationUrl = window.location.href;
      this.rollingSummary = "";
    }

    const messages = this.collectRawChatMessages();
    const conversation = buildConversationContext({
      platform: this.platform.name,
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
    if (event.type !== "NAVIGATE") e.stopPropagation();
    this.dispatch(event);
  }

  private writeInput(text: string) {
    if (!this.inputElement) return;

    // Prefer actual DOM capabilities first so platform config mismatches do not break replacement.
    if (
      this.inputElement instanceof HTMLTextAreaElement ||
      this.inputElement instanceof HTMLInputElement
    ) {
      const proto = Object.getPrototypeOf(this.inputElement);
      const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      if (setter) {
        setter.call(this.inputElement, text);
      } else {
        (this.inputElement as HTMLTextAreaElement | HTMLInputElement).value =
          text;
      }
      this.inputElement.dispatchEvent(new Event("input", { bubbles: true }));
    } else if (
      this.inputElement.isContentEditable ||
      this.platform?.inputType === "contenteditable" ||
      this.platform?.inputType === "prosemirror"
    ) {
      this.inputElement.textContent = text;
      this.inputElement.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          inputType: "insertText",
          data: text,
        }),
      );
    } else {
      // Last-resort fallback for unknown editors
      this.inputElement.textContent = text;
      this.inputElement.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
}

new ExtensionContentScript();
