import type { SlashItem, SlashSource } from "../slash";
import styles from "./styles.css?inline";

const SOURCE_LABELS: Record<SlashSource, string> = {
  card: "Card",
  saved: "Saved",
  gallery: "Gallery",
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text?: string) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * The `/` command's list, anchored to the chat input. It only draws what the
 * driver gives it; keys stay in the chat input and are handled by the driver.
 */
export class SlashMenu {
  private readonly shadowHost: HTMLDivElement;
  private readonly container: HTMLDivElement;
  private visible = false;
  private readonly boundPosition = () => this.position();

  constructor(
    private readonly anchorElement: HTMLElement,
    private readonly onPick: (index: number) => void,
  ) {
    this.shadowHost = document.createElement("div");
    this.shadowHost.id = "plenz-slash-menu";
    const shadowRoot = this.shadowHost.attachShadow({ mode: "closed" });
    const styleEl = document.createElement("style");
    styleEl.textContent = styles;
    shadowRoot.appendChild(styleEl);

    this.container = el("div", "pl-container pl-overlay pl-slash");
    this.container.style.position = "fixed";
    this.container.style.zIndex = "2147483647";
    this.container.setAttribute("role", "listbox");
    this.container.setAttribute("aria-label", "Insert a prompt");
    shadowRoot.appendChild(this.container);
    document.body.appendChild(this.shadowHost);

    window.addEventListener("resize", this.boundPosition);
    window.addEventListener("scroll", this.boundPosition, true);
  }

  /** `loading`: saved and gallery prompts are still on their way. */
  render(items: SlashItem[], selected: number, loading: boolean) {
    const children: Node[] = [];
    if (items.length === 0) {
      children.push(
        el(
          "div",
          "pl-muted pl-slash-empty",
          loading ? "Loading prompts…" : "No matching prompts or context cards.",
        ),
      );
    }
    items.forEach((item, index) => {
      const row = el("div", "pl-slash-item");
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", String(index === selected));
      if (index === selected) row.classList.add("selected");
      const head = el("div", "pl-slash-head");
      head.appendChild(el("span", "pl-slash-title", item.title));
      head.appendChild(el("span", "pl-slash-source", SOURCE_LABELS[item.source]));
      row.appendChild(head);
      row.appendChild(el("div", "pl-slash-preview", item.text.replace(/\s+/g, " ").slice(0, 120)));
      // Keep focus (and the caret) in the chat input.
      row.addEventListener("mousedown", (event) => event.preventDefault());
      row.addEventListener("click", () => this.onPick(index));
      children.push(row);
    });
    children.push(el("div", "pl-footer pl-slash-foot", "↑↓ choose · Enter insert · Esc close"));
    this.container.replaceChildren(...children);

    if (!this.visible) {
      this.visible = true;
      this.container.classList.add("visible");
    }
    this.position();
    this.container.querySelector(".selected")?.scrollIntoView({ block: "nearest" });
  }

  hide() {
    if (!this.visible) return;
    this.visible = false;
    this.container.classList.remove("visible");
    this.container.replaceChildren();
  }

  destroy() {
    this.hide();
    window.removeEventListener("resize", this.boundPosition);
    window.removeEventListener("scroll", this.boundPosition, true);
    this.shadowHost.remove();
  }

  private position() {
    if (!this.visible) return;
    const rect = this.anchorElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const padding = 12;
    const gap = 8;
    const width = Math.min(480, Math.max(300, rect.width));
    const left = Math.max(padding, Math.min(rect.left, window.innerWidth - width - padding));
    this.container.style.width = `${width}px`;
    this.container.style.left = `${left}px`;

    const spaceAbove = rect.top - padding - gap;
    const spaceBelow = window.innerHeight - rect.bottom - padding - gap;
    const above = spaceAbove >= spaceBelow;
    const room = Math.max(140, Math.min(320, above ? spaceAbove : spaceBelow));
    this.container.style.maxHeight = `${room}px`;
    const height = Math.min(this.container.offsetHeight, room);
    const top = above ? rect.top - gap - height : rect.bottom + gap;
    this.container.style.top = `${Math.max(padding, top)}px`;
  }
}
