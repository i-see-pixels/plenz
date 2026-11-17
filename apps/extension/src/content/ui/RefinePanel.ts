import {
  applyDiff,
  REFINE_MODE_LABELS,
  type PromptDiff,
  type RefineStep,
} from "@plenz/core";
import type { RefineMode } from "@plenz/types";
import type { ContextCard } from "../../shared/context-cards";
import type { PanelView } from "../machine";
import styles from "./styles.css?inline";

const MODES: { mode: RefineMode; blurb: string }[] = [
  { mode: "improve", blurb: "Clearer and more specific" },
  { mode: "tighten", blurb: "Shorter, same requirements" },
  { mode: "structure", blurb: "Sections: context, task, format" },
  { mode: "ask", blurb: "Answer 2–3 questions first" },
];

const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = IS_MAC ? "⌘" : "Ctrl";

export type RefinePanelHandlers = {
  onMode(mode: RefineMode): void;
  /** Add a saved context card to the draft. */
  onCard(id: string): void;
  onAccept(): void;
  onDismiss(): void;
  onAnswer(index: number, value: string): void;
  onSubmitAnswers(): void;
  /** Keep the draft's wording for one diff change (or take it back). */
  onToggleChange(index: number): void;
  onResetChanges(): void;
};

function stepLabel(step: RefineStep) {
  return step === "compose" ? REFINE_MODE_LABELS.ask : REFINE_MODE_LABELS[step];
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Rebuild only when this changes; otherwise update in place (keeps input focus). */
function structureKey(view: PanelView) {
  switch (view.kind) {
    case "picking":
      return `picking:${view.recommended}:${view.findings.map((f) => f.label).join("|")}`;
    case "streaming":
    case "result":
    case "failed":
      return `${view.kind}:${view.step}`;
    case "answering":
      return `answering:${view.questions.join("\n")}`;
    default:
      return view.kind;
  }
}

/**
 * The refine panel: mode picker, streamed output, Ask me questions and the
 * finished result. It only renders what the content machine's view says.
 */
export class RefinePanel {
  private readonly shadowHost: HTMLDivElement;
  private readonly container: HTMLDivElement;
  private renderedKey: string | null = null;
  private output: HTMLElement | null = null;
  private resultActions: HTMLElement | null = null;
  /** Result view: diff of changes, or the text that will be applied. Null until decided. */
  private showDiff: boolean | null = null;
  private viewToggles: { diff: boolean; button: HTMLButtonElement }[] = [];
  private lastResult: { view: Extract<PanelView, { kind: "result" }>; diff: PromptDiff | null } | null =
    null;
  private visible = false;
  private cards: ContextCard[] = [];
  private readonly boundPosition = () => this.position();

  constructor(
    private readonly anchorElement: HTMLElement,
    private readonly handlers: RefinePanelHandlers,
  ) {
    this.shadowHost = document.createElement("div");
    this.shadowHost.id = "plenz-refine-panel";
    const shadowRoot = this.shadowHost.attachShadow({ mode: "closed" });

    const styleEl = document.createElement("style");
    styleEl.textContent = styles;
    shadowRoot.appendChild(styleEl);

    this.container = el("div", "pl-container pl-overlay pl-refine");
    this.container.style.position = "fixed";
    this.container.style.zIndex = "2147483647";
    // Keep keystrokes in our inputs away from the page's own shortcuts.
    for (const type of ["keydown", "keyup", "keypress", "input"]) {
      this.container.addEventListener(type, (event) => {
        if (event.target !== this.container) event.stopPropagation();
      });
    }
    shadowRoot.appendChild(this.container);
    document.body.appendChild(this.shadowHost);

    window.addEventListener("resize", this.boundPosition);
    window.addEventListener("scroll", this.boundPosition, true);
  }

  render(view: PanelView | null, diff: PromptDiff | null = null) {
    if (!view) {
      this.hide();
      return;
    }

    const key =
      view.kind === "picking"
        ? `${structureKey(view)}:${this.cards.map((card) => `${card.id}=${card.title}`).join("|")}`
        : structureKey(view);
    if (key !== this.renderedKey) {
      this.renderedKey = key;
      this.build(view);
    } else if (view.kind === "streaming" && this.output) {
      this.setOutput(view.output, true);
    }
    if (view.kind === "result") {
      this.lastResult = { view, diff };
      this.updateResult(view, diff);
    }

    if (!this.visible) {
      this.visible = true;
      this.container.classList.add("visible");
    }
    this.position();
    requestAnimationFrame(this.boundPosition);
  }

  private hide() {
    this.visible = false;
    this.renderedKey = null;
    this.output = null;
    this.resultActions = null;
    this.lastResult = null;
    this.container.classList.remove("visible");
    this.container.replaceChildren();
  }

  /** The saved context cards; the picker shows them on its next render. */
  setCards(cards: ContextCard[]) {
    this.cards = cards;
  }

  destroy() {
    this.hide();
    window.removeEventListener("resize", this.boundPosition);
    window.removeEventListener("scroll", this.boundPosition, true);
    this.shadowHost.remove();
  }

  private header(title: string) {
    const header = el("div", "pl-header");
    header.appendChild(el("span", "", title));
    const close = el("button", "pl-close-btn", "✕");
    close.type = "button";
    close.title = "Close (Esc)";
    close.setAttribute("aria-label", "Close");
    close.addEventListener("click", () => this.handlers.onDismiss());
    header.appendChild(close);
    return header;
  }

  private button(label: string, onClick: () => void, primary = false) {
    const button = el("button", primary ? "pl-btn pl-btn-primary" : "pl-btn", label);
    button.type = "button";
    button.addEventListener("click", onClick);
    return button;
  }

  private footer(...hints: [key: string, label: string][]) {
    const footer = el("div", "pl-footer");
    for (const [key, label] of hints) {
      const hint = el("span");
      hint.appendChild(el("span", "pl-key-hint", key));
      hint.append(` ${label}`);
      footer.appendChild(hint);
    }
    return footer;
  }

  /** Saved context cards; adding one is local and free. */
  private cardRow() {
    if (this.cards.length === 0) {
      return el(
        "div",
        "pl-muted pl-gap",
        "Tip: save context cards (about you, a project, a tone) in plenz settings to add them here.",
      );
    }
    const row = el("div", "pl-mode-row pl-card-row");
    row.appendChild(el("span", "pl-muted", "Add context:"));
    for (const card of this.cards) {
      const chip = this.button(card.title, () => this.handlers.onCard(card.id));
      chip.classList.add("pl-btn-small", "pl-card-chip");
      chip.title = card.text.length > 200 ? `${card.text.slice(0, 200)}…` : card.text;
      row.appendChild(chip);
    }
    return row;
  }

  /** Small row of modes for trying again another way. */
  private modeRow(exclude?: RefineStep) {
    const row = el("div", "pl-mode-row");
    row.appendChild(el("span", "pl-muted", "Try:"));
    for (const { mode } of MODES) {
      if (mode === exclude || (exclude === "compose" && mode === "ask")) continue;
      const chip = this.button(REFINE_MODE_LABELS[mode], () => this.handlers.onMode(mode));
      chip.classList.add("pl-btn-small");
      row.appendChild(chip);
    }
    return row;
  }

  private setOutput(text: string, streaming: boolean) {
    if (!this.output) return;
    this.output.textContent = text;
    this.output.classList.toggle("pl-streaming", streaming);
    if (streaming) this.output.scrollTop = this.output.scrollHeight;
  }

  private build(view: PanelView) {
    const body: Node[] = [];
    this.output = null;
    this.resultActions = null;
    this.showDiff = null;
    this.viewToggles = [];

    switch (view.kind) {
      case "picking": {
        body.push(this.header("Refine prompt"));
        if (view.findings.length > 0) {
          body.push(
            el("div", "pl-muted pl-gap", `Missing: ${view.findings.map((f) => f.label).join(" · ")}`),
          );
        }
        const grid = el("div", "pl-mode-grid");
        for (const { mode, blurb } of MODES) {
          const card = el("button", "pl-mode-card");
          card.type = "button";
          card.appendChild(el("span", "pl-mode-name", REFINE_MODE_LABELS[mode]));
          card.appendChild(el("span", "pl-mode-blurb", blurb));
          if (mode === view.recommended) {
            card.classList.add("recommended");
            card.appendChild(el("span", "pl-mode-tag", "Suggested"));
          }
          card.addEventListener("click", () => this.handlers.onMode(mode));
          grid.appendChild(card);
        }
        body.push(grid);
        body.push(this.cardRow());
        body.push(this.footer(["Esc", "close"], [`${MOD}⇧Enter`, "Improve"]));
        body.push(el("div", "pl-muted pl-note", "Each mode is one call to your AI provider."));
        break;
      }

      case "streaming": {
        body.push(this.header(`${stepLabel(view.step)} · writing…`));
        this.output = el("div", "pl-output");
        body.push(this.output);
        body.push(this.button("Stop", () => this.handlers.onDismiss()));
        break;
      }

      case "result": {
        body.push(this.header(`${stepLabel(view.step)} · ready`));
        const toggles = el("div", "pl-view-toggle");
        for (const [diff, label] of [
          [true, "Changes"],
          [false, "Result"],
        ] as const) {
          const button = this.button(label, () => {
            this.showDiff = diff;
            if (this.lastResult) this.updateResult(this.lastResult.view, this.lastResult.diff);
          });
          button.classList.add("pl-btn-small");
          this.viewToggles.push({ diff, button });
          toggles.appendChild(button);
        }
        body.push(toggles);
        this.output = el("div", "pl-output");
        body.push(this.output);
        this.resultActions = el("div", "pl-actions");
        body.push(this.resultActions);
        body.push(this.modeRow(view.step));
        body.push(this.footer(["Tab", "replace"], ["Esc", "close"]));
        body.push(el("div", "pl-muted pl-note", "Click a change to keep your own wording there."));
        break;
      }

      case "asking":
        body.push(this.header(REFINE_MODE_LABELS.ask));
        body.push(el("div", "pl-muted pl-status", "Finding the questions that matter most…"));
        body.push(this.button("Stop", () => this.handlers.onDismiss()));
        break;

      case "answering": {
        body.push(this.header(REFINE_MODE_LABELS.ask));
        body.push(el("div", "pl-muted pl-gap", "Answer what you can; blanks are skipped."));
        const form = el("form", "pl-questions");
        const inputs: HTMLInputElement[] = [];
        view.questions.forEach((question, index) => {
          const label = el("label", "pl-question");
          label.appendChild(el("span", "", question));
          const input = el("input", "pl-input");
          input.type = "text";
          input.value = view.answers[index] ?? "";
          input.addEventListener("input", () => this.handlers.onAnswer(index, input.value));
          input.addEventListener("keydown", (event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            const next = inputs[index + 1];
            if (next && !(event.ctrlKey || event.metaKey)) next.focus();
            else this.handlers.onSubmitAnswers();
          });
          inputs.push(input);
          label.appendChild(input);
          form.appendChild(label);
        });
        form.addEventListener("submit", (event) => {
          event.preventDefault();
          this.handlers.onSubmitAnswers();
        });
        body.push(form);
        const actions = el("div", "pl-actions");
        actions.appendChild(this.button("Write prompt", () => this.handlers.onSubmitAnswers(), true));
        actions.appendChild(this.button("Cancel", () => this.handlers.onDismiss()));
        body.push(actions);
        body.push(this.footer([`${MOD}Enter`, "write prompt"], ["Esc", "close"]));
        requestAnimationFrame(() => inputs[0]?.focus());
        break;
      }

      case "failed": {
        body.push(this.header(`${stepLabel(view.step)} · failed`));
        body.push(el("div", "pl-error", view.message));
        const retry: RefineMode = view.step === "compose" ? "ask" : view.step;
        const actions = el("div", "pl-actions");
        actions.appendChild(this.button("Try again", () => this.handlers.onMode(retry), true));
        actions.appendChild(this.button("Close", () => this.handlers.onDismiss()));
        body.push(actions);
        body.push(this.modeRow(view.step));
        break;
      }
    }

    this.container.replaceChildren(...body);
    if (view.kind === "streaming") this.setOutput(view.output, true);
  }

  /** Fill the result's output and actions; runs on every render so toggles update in place. */
  private updateResult(view: Extract<PanelView, { kind: "result" }>, diff: PromptDiff | null) {
    const output = this.output;
    const actions = this.resultActions;
    if (!output || !actions) return;

    const changes = diff?.changeCount ?? 0;
    const rejected = new Set(view.rejected);
    const kept = changes - view.rejected.filter((i) => i < changes).length;

    // Changes view, unless the diff would just be noise.
    if (this.showDiff === null) {
      this.showDiff = !!diff && changes > 0 && !diff.wholesale && diff.similarity >= 0.3;
    }
    for (const toggle of this.viewToggles) {
      toggle.button.setAttribute("aria-pressed", String(toggle.diff === this.showDiff));
      toggle.button.hidden = changes === 0;
    }

    const scroll = output.scrollTop;
    output.classList.remove("pl-streaming");
    if (this.showDiff && diff && changes > 0) {
      output.replaceChildren(...this.diffNodes(diff, rejected));
    } else {
      output.textContent = diff ? applyDiff(diff, view.rejected) : view.output;
    }
    output.scrollTop = scroll;

    const nodes: Node[] = [];
    if (changes === 0) {
      nodes.push(el("span", "pl-muted", "No changes suggested."));
    } else {
      const label =
        kept === changes
          ? "Replace prompt"
          : kept === 0
            ? "No changes selected"
            : `Apply ${kept} of ${changes} change${changes === 1 ? "" : "s"}`;
      const primary = this.button(label, () => this.handlers.onAccept(), true);
      primary.disabled = kept === 0;
      nodes.push(primary);
      if (kept < changes) {
        nodes.push(this.button("Use all changes", () => this.handlers.onResetChanges()));
      }
    }
    nodes.push(this.button("Discard", () => this.handlers.onDismiss()));
    actions.replaceChildren(...nodes);
  }

  private diffNodes(diff: PromptDiff, rejected: Set<number>): Node[] {
    return diff.segments.map((segment) => {
      if (segment.kind === "same") return document.createTextNode(segment.text);

      const kept = rejected.has(segment.index);
      const change = el("span", kept ? "pl-change kept-original" : "pl-change");
      change.setAttribute("role", "button");
      change.tabIndex = 0;
      change.title = kept
        ? "Using your wording here. Click to use the suggestion."
        : "Click to keep your wording here.";
      if (segment.removed) change.appendChild(el("del", "pl-del", segment.removed));
      if (segment.added) change.appendChild(el("ins", "pl-ins", segment.added));
      const toggle = () => this.handlers.onToggleChange(segment.index);
      change.addEventListener("click", toggle);
      change.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggle();
        }
      });
      return change;
    });
  }


  /** Same width as the input, placed above it when there's room, else below. */
  private position() {
    if (!this.visible) return;
    const rect = this.anchorElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const padding = 12;
    const gap = 8;
    const width = Math.min(600, Math.max(320, rect.width));
    const left = Math.max(padding, Math.min(rect.left, window.innerWidth - width - padding));
    this.container.style.width = `${width}px`;
    this.container.style.left = `${left}px`;

    const spaceAbove = rect.top - padding - gap;
    const spaceBelow = window.innerHeight - rect.bottom - padding - gap;
    const above = spaceAbove >= Math.min(360, spaceBelow) || spaceAbove > spaceBelow;
    const room = Math.max(160, above ? spaceAbove : spaceBelow);
    this.container.style.maxHeight = `${room}px`;

    const height = Math.min(this.container.offsetHeight, room);
    const top = above ? rect.top - gap - height : rect.bottom + gap;
    this.container.style.top = `${Math.max(padding, top)}px`;
  }
}
