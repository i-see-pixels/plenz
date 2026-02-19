import styles from "./styles.css?inline"

export class BadgeIndicator {
	private shadowHost: HTMLDivElement
	private shadowRoot: ShadowRoot
	private badge: HTMLDivElement
	private visible: boolean = false

	constructor(anchorElement: HTMLElement) {
		this.shadowHost = document.createElement("div")
		this.shadowHost.id = "promptlens-badge-host"

		// We use closed shadow DOM to protect styles
		this.shadowRoot = this.shadowHost.attachShadow({ mode: "closed" })

		const styleEl = document.createElement("style")
		styleEl.textContent = styles
		this.shadowRoot.appendChild(styleEl)

		this.badge = document.createElement("div")
		this.badge.className = "pl-badge"
		this.badge.style.display = "none"
		this.shadowRoot.appendChild(this.badge)

		// Append to anchor's parent to avoid messing with input value/layout if possible
		// But for positioning "inside" input, we might need to be absolute relative to input container
		const parent = anchorElement.parentElement
		if (parent) {
			const computedStyle = window.getComputedStyle(parent)
			if (computedStyle.position === "static") {
				parent.style.position = "relative"
			}
			parent.appendChild(this.shadowHost)
		} else {
			anchorElement.appendChild(this.shadowHost)
		}
	}

	public show(count: number) {
		if (count <= 0) {
			this.hide()
			return
		}
		this.badge.innerHTML = `⚡ ${count}`
		this.badge.style.display = "flex"
		this.visible = true
	}

	public showSaving() {
		this.badge.innerHTML = `⚡ ...`
		this.badge.style.display = "flex"
		this.visible = true
	}

	public hide() {
		this.badge.style.display = "none"
		this.visible = false
	}

	public setOnClick(handler: () => void) {
		this.badge.addEventListener("click", handler)
	}
}
