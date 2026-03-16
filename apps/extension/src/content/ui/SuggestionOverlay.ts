import { Suggestion } from "@promptlens/types";
import styles from "./styles.css?inline";

export class SuggestionOverlay {
  private shadowHost: HTMLDivElement;
  private shadowRoot: ShadowRoot;
  private container: HTMLDivElement;
  private anchorElement: HTMLElement;
  private visible: boolean = false;
  private suggestions: Suggestion[] = [];
  private activeIndex: number = 0;
  private onSelect: ((suggestion: Suggestion) => void) | null = null;

  constructor(anchorElement: HTMLElement) {
    this.anchorElement = anchorElement;
    this.shadowHost = document.createElement("div");
    this.shadowHost.id = "promptlens-overlay";
    this.shadowRoot = this.shadowHost.attachShadow({ mode: "closed" });

    // Inject styles
    const styleEl = document.createElement("style");
    styleEl.textContent = styles;
    this.shadowRoot.appendChild(styleEl);

    this.container = document.createElement("div");
    this.container.className = "pl-container pl-overlay";
    this.shadowRoot.appendChild(this.container);

    document.body.appendChild(this.shadowHost);
    this.container.style.position = "fixed";
    this.container.style.zIndex = "2147483647";

    this.bindEvents();
  }

  private bindEvents() {
    window.addEventListener("resize", () => this.positionOverlay());
    window.addEventListener("scroll", () => this.positionOverlay(), true);
  }

  public show(
    suggestions: Suggestion[],
    mode: "popover" | "ghost" = "popover",
  ) {
    if (suggestions.length === 0) {
      this.hide();
      return;
    }

    this.suggestions = suggestions;
    this.activeIndex = 0;

    if (mode === "ghost") {
      this.renderGhostText();
    } else {
      this.render();
    }

    this.container.classList.add("visible");
    this.visible = true;
    this.positionOverlay();
    requestAnimationFrame(() => {
      this.positionOverlay();
      this.scrollToActive();
    });
  }

  public hide() {
    this.container.classList.remove("visible");
    // Clear ghost text if present
    const ghost = this.shadowRoot.querySelector(".pl-ghost-overlay");
    if (ghost) ghost.remove();

    this.visible = false;
  }

  private renderGhostText() {
    // Remove existing ghost if any
    const existing = this.shadowRoot.querySelector(".pl-ghost-overlay");
    if (existing) existing.remove();

    if (this.suggestions.length === 0) return;

    const suggestion = this.suggestions[0]; // Only show top suggestion
    const ghost = document.createElement("div");
    ghost.className = "pl-ghost-overlay";
    ghost.textContent = suggestion.suggested;

    // This needs complex positioning logic to match input text exactly
    // For now, we append it to container. Real generic implementation is hard without specific platform input coordinates.
    // We'll trust the consumer (styles.css) to position it absolutely over the input.
    this.container.innerHTML = ""; // Clear popover content
    this.container.appendChild(ghost);
  }

  private render() {
    this.container.innerHTML = `
            <div class="pl-header">
                <span style="display:flex; align-items:center; gap:4px"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-zap"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg> PromptLens Suggestions</span>
                <span class="pl-close-btn" id="pl-close" style="display:flex; align-items:center;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></span>
            </div>
            <div class="pl-suggestion-list">
                ${this.suggestions
        .map(
          (s, idx) => `
                    <div class="pl-suggestion-item ${idx === this.activeIndex ? "active" : ""}" data-index="${idx}">
                        <div class="pl-suggestion-text">${this.escapeHtml(s.suggested)}</div>
                        <div class="pl-suggestion-rationale">
                             <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-lightbulb" style="display:inline; margin-right:4px; vertical-align:-2px;"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.9 1.2 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg> ${this.escapeHtml(s.rationale)}
                        </div>
                    </div>
                `,
        )
        .join("")}
            </div>
            <div class="pl-footer">
                <span>[Tab] Accept</span>
                <span>[Esc] Dismiss</span>
                <span>[↑↓] Navigate</span>
            </div>
        `;

    // Re-bind click events
    const items = this.container.querySelectorAll(".pl-suggestion-item");
    items.forEach((item) => {
      item.addEventListener("click", () => {
        const idx = parseInt(item.getAttribute("data-index") || "0", 10);
        this.activeIndex = idx;
        this.render();
        const suggestion = this.suggestions[this.activeIndex];
        if (suggestion) {
          this.onSelect?.(suggestion);
        }
      });
    });

    this.container
      .querySelector("#pl-close")
      ?.addEventListener("click", () => this.hide());
  }

  private scrollToActive() {
    requestAnimationFrame(() => {
      const activeItem = this.container.querySelector(
        `.pl-suggestion-item[data-index="${this.activeIndex}"]`,
      ) as HTMLElement;
      if (activeItem) {
        activeItem.scrollIntoView({ block: "nearest", behavior: "auto" });
      }
    });
  }

  public navigate(direction: "up" | "down") {
    if (!this.visible) return;

    if (direction === "down") {
      this.activeIndex = (this.activeIndex + 1) % this.suggestions.length;
    } else {
      this.activeIndex =
        (this.activeIndex - 1 + this.suggestions.length) %
        this.suggestions.length;
    }
    this.render();
    this.positionOverlay();
    this.scrollToActive();
  }

  public getActiveSuggestion(): Suggestion | null {
    if (!this.visible || this.suggestions.length === 0) return null;
    return this.suggestions[this.activeIndex];
  }

  public isVisible(): boolean {
    return this.visible;
  }

  public setOnSelect(handler: (suggestion: Suggestion) => void) {
    this.onSelect = handler;
  }

  private positionOverlay() {
    if (!this.visible) return;

    const rect = this.anchorElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const viewportPadding = 12;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Width logic
    const width = Math.min(600, Math.max(320, rect.width));
    const maxLeft = windowWidth - width - viewportPadding;
    const left = Math.max(viewportPadding, Math.min(rect.left, maxLeft));

    this.container.style.width = `${width}px`;
    this.container.style.maxWidth = `${width}px`;
    this.container.style.minWidth = `${width}px`;
    this.container.style.left = `${left}px`;

    // Height and Vertical Positioning logic
    const spaceAbove = rect.top - viewportPadding;
    const spaceBelow = windowHeight - rect.bottom - viewportPadding;
    const preferredMaxHeight = 480;

    const suggestionList = this.container.querySelector(
      ".pl-suggestion-list",
    ) as HTMLElement;
    const header = this.container.querySelector(".pl-header") as HTMLElement;
    const footer = this.container.querySelector(".pl-footer") as HTMLElement;

    const chromeHeight =
      (header?.offsetHeight || 0) +
      (footer?.offsetHeight || 0) +
      24 + // padding-top/bottom of .pl-overlay
      8; // margin-top of .pl-overlay

    // Decide if we show above or below
    // Priority: Below if there's enough space for preferredMaxHeight, otherwise Above if there's more space Above.
    const showBelow =
      spaceBelow >= preferredMaxHeight + chromeHeight ||
      spaceBelow >= spaceAbove;

    if (showBelow) {
      this.container.style.top = `${rect.bottom}px`;
      this.container.style.bottom = "auto";
      const availableHeight = spaceBelow - chromeHeight;
      if (suggestionList) {
        suggestionList.style.maxHeight = `${Math.min(preferredMaxHeight, availableHeight)}px`;
      }
    } else {
      // Show above
      const availableHeight = spaceAbove - chromeHeight;
      if (suggestionList) {
        suggestionList.style.maxHeight = `${Math.min(preferredMaxHeight, availableHeight)}px`;
      }
      // Re-measure height after setting maxHeight on list
      const overlayHeight = this.container.offsetHeight;
      this.container.style.top = `${rect.top - overlayHeight - 8}px`;
      this.container.style.bottom = "auto";
    }
  }

  private escapeHtml(str: string) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
}
