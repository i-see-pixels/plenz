import { getActivePlatform, PlatformConfig } from "./platforms/registry";
import { SuggestionOverlay } from "./ui/SuggestionOverlay";
import { BadgeIndicator } from "./ui/BadgeIndicator";
import { GhostOverlay } from "./ui/GhostOverlay";
import { Suggestion } from "@promptlens/types";

class ExtensionContentScript {
  private platform: PlatformConfig | null = null;
  private inputElement: HTMLElement | null = null;
  private overlay: SuggestionOverlay | null = null;
  private ghostOverlay: GhostOverlay | null = null;
  private badge: BadgeIndicator | null = null;
  private currentSuggestions: Suggestion[] = [];
  private runtimeUnavailableLogged = false;

  constructor() {
    this.platform = getActivePlatform();
    if (this.platform) {
      this.init();
    }
  }

  private init() {
    this.observeDOM();
    this.detectInput();

    // Global keyboard listener for shortcuts when overlay is active
    document.addEventListener(
      "keydown",
      this.handleGlobalKeydown.bind(this),
      true,
    );
  }

  private observeDOM() {
    const observer = new MutationObserver(() => {
      if (!this.inputElement) this.detectInput();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  private detectInput() {
    if (!this.platform) return;

    for (const selector of this.platform.inputSelectors) {
      const el = document.querySelector(selector) as HTMLElement;
      if (el) {
        // Determine container for overlay (usually parent of input)
        const container = el.parentElement || el;
        this.inputElement = el;
        this.overlay = new SuggestionOverlay(container);
        this.ghostOverlay = new GhostOverlay(el);
        this.badge = new BadgeIndicator(container);
        this.overlay.setOnSelect((suggestion) =>
          this.applySuggestion(suggestion),
        );

        this.hookInput(el);
        break;
      }
    }
  }

  private hookInput(el: HTMLElement) {
    el.addEventListener("input", this.handleInput.bind(this));

    // Badge click handler
    this.badge?.setOnClick(() => {
      if (this.currentSuggestions.length > 0) {
        this.overlay?.show(this.currentSuggestions);
        this.badge?.hide();
      }
    });
  }

  private debounceTimer: number | null = null;

  private handleInput(e: Event) {
    const target = e.target as HTMLElement;
    const text = (target as any).value || target.innerText || "";

    if (text.length < 10) {
      this.currentSuggestions = [];
      this.badge?.hide();
      // Hide overlays if text is too short or cleared
      if (this.overlay?.isVisible()) this.overlay.hide();
      this.ghostOverlay?.hide();
      return;
    }

    // Clear existing timer
    if (this.debounceTimer) {
      window.clearTimeout(this.debounceTimer);
    }

    // Hide ghost text while typing (until new analysis arrives)
    this.ghostOverlay?.hide();

    // Set new timer
    this.debounceTimer = window.setTimeout(() => {
      this.analyzePrompt(text);
    }, 500); // 500ms debounce
  }

  private async analyzePrompt(text: string) {
    try {
      this.badge?.showSaving();
      const response = await this.sendRuntimeMessage<{
        suggestions?: Suggestion[];
        error?: string;
      }>({
        type: "ANALYZE_PROMPT",
        payload: {
          prompt: text,
          context: {
            active_website: window.location.hostname,
            // More context could be added here if needed
          }
        },
      });

      if (!response) {
        this.currentSuggestions = [];
        this.badge?.hide();
        this.ghostOverlay?.hide();
        return;
      }

      if (response?.error) {
        throw new Error(response.error);
      }

      if (response && response.suggestions && response.suggestions.length > 0) {
        this.currentSuggestions = response.suggestions;
        this.badge?.show(this.currentSuggestions.length);
        this.overlay?.show(this.currentSuggestions);
        this.badge?.hide();

        // Show ghost text for the top suggestion if applicable
        const topSuggestion = this.currentSuggestions[0];
        this.ghostOverlay?.update(text, topSuggestion.suggested);
      } else {
        this.currentSuggestions = [];
        this.badge?.hide();
        this.ghostOverlay?.hide();
      }
    } catch (error) {
      console.error("PromptLens Analysis Error:", error);
      this.badge?.hide();
      this.ghostOverlay?.hide();
    }
  }

  private async sendRuntimeMessage<T>(message: unknown): Promise<T | null> {
    const runtime = globalThis.chrome?.runtime;
    if (!runtime?.id || typeof runtime.sendMessage !== "function") {
      if (!this.runtimeUnavailableLogged) {
        console.warn(
          "PromptLens: extension runtime is unavailable. Reload the extension and page.",
        );
        this.runtimeUnavailableLogged = true;
      }
      return null;
    }

    return (await runtime.sendMessage(message)) as T;
  }

  private handleGlobalKeydown(e: KeyboardEvent) {
    // Pass-through to overlay if visible
    if (this.overlay && this.overlay.isVisible()) {
      if (e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        this.acceptSuggestion();
        return;
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        this.overlay.hide();
        // Show badge again if we just dismissed overlay
        if (this.currentSuggestions.length > 0) {
          this.badge?.show(this.currentSuggestions.length);
        }
        return;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        this.overlay.navigate("up");
        return;
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        this.overlay.navigate("down");
        return;
      }
    }

    // Handle Tab for Ghost Text even if overlay is NOT visible (common UX)
    // But only if ghost text is actually visible?
    // Note from plan: "On Accept (Tab), accept the ghost text completion (which mimics the top suggestion)."
    // We should check if ghost overlay is visible. Unfortunately GhostOverlay doesn't expose isVisible yet, or we assume data presence.
    // Let's add a check. `this.currentSuggestions` implies we have data.

    if (
      e.key === "Tab" &&
      this.currentSuggestions.length > 0 &&
      !this.overlay?.isVisible()
    ) {
      // Accept top suggestion
      e.preventDefault();
      e.stopPropagation();
      this.acceptSuggestion();
    }
  }

  private acceptSuggestion() {
    // If overlay is active, take its selection.
    // If only ghost text is active (overlay hidden), take top suggestion.

    let suggestion: Suggestion | null = null;

    if (this.overlay?.isVisible()) {
      suggestion = this.overlay.getActiveSuggestion();
    } else if (this.currentSuggestions.length > 0) {
      suggestion = this.currentSuggestions[0];
    }

    if (suggestion) this.applySuggestion(suggestion);
  }

  private applySuggestion(suggestion: Suggestion) {
    if (!this.inputElement) return;

    const text = suggestion.suggested;

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

    this.overlay?.hide();
    this.badge?.hide();
    this.ghostOverlay?.hide();
    this.currentSuggestions = [];
  }
}

new ExtensionContentScript();
