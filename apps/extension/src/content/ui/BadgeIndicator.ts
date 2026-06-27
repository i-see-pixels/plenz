import styles from "./styles.css?inline";

const ZAP_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-zap"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>`;
const ALERT_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-alert"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>`;

export class BadgeIndicator {
  private anchorElement: HTMLElement;
  private shadowHost: HTMLDivElement;
  private shadowRoot: ShadowRoot;
  private badge: HTMLDivElement;
  private visible: boolean = false;
  private resizeObserver: ResizeObserver;
  private readonly boundUpdatePosition: () => void;

  constructor(anchorElement: HTMLElement) {
    this.anchorElement = anchorElement;
    this.boundUpdatePosition = this.updatePosition.bind(this);
    this.shadowHost = document.createElement("div");
    this.shadowHost.id = "plenz-badge-host";
    this.shadowHost.style.position = "fixed";
    this.shadowHost.style.zIndex = "10001";
    this.shadowHost.style.display = "inline-block";
    this.shadowHost.style.pointerEvents = "none";

    // We use closed shadow DOM to protect styles
    this.shadowRoot = this.shadowHost.attachShadow({ mode: "closed" });

    const styleEl = document.createElement("style");
    styleEl.textContent = styles;
    this.shadowRoot.appendChild(styleEl);

    this.badge = document.createElement("div");
    this.badge.className = "pl-badge";
    this.badge.style.display = "none";
    this.shadowRoot.appendChild(this.badge);

    document.body.appendChild(this.shadowHost);

    this.resizeObserver = new ResizeObserver(this.boundUpdatePosition);
    this.resizeObserver.observe(anchorElement);
    window.addEventListener("resize", this.boundUpdatePosition);
    window.addEventListener("scroll", this.boundUpdatePosition, true);
  }

  private updatePosition() {
    if (!this.visible || !this.anchorElement.isConnected) return;

    const anchorRect = this.anchorElement.getBoundingClientRect();
    const hostRect = this.shadowHost.getBoundingClientRect();
    const viewportPadding = 8;
    const gap = 6;
    const right = Math.max(
      viewportPadding,
      window.innerWidth - anchorRect.right + viewportPadding,
    );
    const spaceAbove = anchorRect.top - gap;
    const top =
      spaceAbove >= hostRect.height + viewportPadding
        ? anchorRect.top - hostRect.height - gap
        : anchorRect.bottom + gap;

    const maxTop = Math.max(
      viewportPadding,
      window.innerHeight - hostRect.height - viewportPadding,
    );

    this.shadowHost.style.right = `${right}px`;
    this.shadowHost.style.top = `${Math.min(maxTop, Math.max(viewportPadding, top))}px`;
  }

  private reveal() {
    this.badge.style.display = "flex";
    this.badge.style.alignItems = "center";
    this.visible = true;
    this.updatePosition();
    requestAnimationFrame(this.boundUpdatePosition);
  }

  public show(count: number) {
    if (count <= 0) {
      this.hide();
      return;
    }
    this.badge.classList.remove("error");
    this.badge.innerHTML = `${ZAP_ICON} <span style="margin-left:4px">${count}</span>`;
    this.badge.title = "";
    this.reveal();
  }

  public showSaving() {
    this.badge.classList.remove("error");
    this.badge.innerHTML = `${ZAP_ICON} <span style="margin-left:4px">...</span>`;
    this.badge.title = "";
    this.reveal();
  }

  public showError(message?: string) {
    this.badge.classList.add("error");
    this.badge.innerHTML = `${ALERT_ICON}`;
    this.badge.title = message || "An error occurred";
    this.reveal();
  }

  public hide() {
    this.badge.style.display = "none";
    this.visible = false;
  }

  public setOnClick(handler: () => void) {
    this.badge.addEventListener("click", handler);
  }

  public destroy() {
    this.resizeObserver.disconnect();
    window.removeEventListener("resize", this.boundUpdatePosition);
    window.removeEventListener("scroll", this.boundUpdatePosition, true);
    this.shadowHost.remove();
  }
}

