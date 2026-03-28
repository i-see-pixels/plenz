import styles from "./styles.css?inline";

const ZAP_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-zap"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>`;
const ALERT_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-alert"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>`;

export class BadgeIndicator {
  private shadowHost: HTMLDivElement;
  private shadowRoot: ShadowRoot;
  private badge: HTMLDivElement;
  private visible: boolean = false;

  constructor(anchorElement: HTMLElement) {
    this.shadowHost = document.createElement("div");
    this.shadowHost.id = "promptlens-badge-host";

    // We use closed shadow DOM to protect styles
    this.shadowRoot = this.shadowHost.attachShadow({ mode: "closed" });

    const styleEl = document.createElement("style");
    styleEl.textContent = styles;
    this.shadowRoot.appendChild(styleEl);

    this.badge = document.createElement("div");
    this.badge.className = "pl-badge";
    this.badge.style.display = "none";
    this.shadowRoot.appendChild(this.badge);

    // Append to anchor's parent to avoid messing with input value/layout if possible
    // But for positioning "inside" input, we might need to be absolute relative to input container
    const parent = anchorElement.parentElement;
    if (parent) {
      const computedStyle = window.getComputedStyle(parent);
      if (computedStyle.position === "static") {
        parent.style.position = "relative";
      }
      parent.appendChild(this.shadowHost);
    } else {
      anchorElement.appendChild(this.shadowHost);
    }
  }

  public show(count: number) {
    if (count <= 0) {
      this.hide();
      return;
    }
    this.badge.classList.remove("error");
    this.badge.innerHTML = `${ZAP_ICON} <span style="margin-left:4px">${count}</span>`;
    this.badge.style.display = "flex";
    this.badge.style.alignItems = "center";
    this.badge.title = "";
    this.visible = true;
  }

  public showSaving() {
    this.badge.classList.remove("error");
    this.badge.innerHTML = `${ZAP_ICON} <span style="margin-left:4px">...</span>`;
    this.badge.style.display = "flex";
    this.badge.style.alignItems = "center";
    this.badge.title = "";
    this.visible = true;
  }

  public showError(message?: string) {
    this.badge.classList.add("error");
    this.badge.innerHTML = `${ALERT_ICON}`;
    this.badge.style.display = "flex";
    this.badge.style.alignItems = "center";
    this.badge.title = message || "An error occurred";
    this.visible = true;
  }

  public hide() {
    this.badge.style.display = "none";
    this.visible = false;
  }

  public setOnClick(handler: () => void) {
    this.badge.addEventListener("click", handler);
  }
}
