export class GhostOverlay {
	private shadowHost: HTMLDivElement
	private shadowRoot: ShadowRoot
	private container: HTMLDivElement
	private inputElement: HTMLElement
	private visible: boolean = false

	constructor(inputElement: HTMLElement) {
		this.inputElement = inputElement
		this.shadowHost = document.createElement("div")
		this.shadowHost.id = "plenz-ghost-host"

		this.shadowRoot = this.shadowHost.attachShadow({ mode: "open" }) // Open for dev/debug

		this.container = document.createElement("div")
		this.container.className = "pl-ghost-container"
		this.container.style.pointerEvents = "none"
		this.container.style.position = "absolute"
		this.container.style.top = "0"
		this.container.style.left = "0"
		this.container.style.boxSizing = "border-box" // Critical
		this.container.style.overflow = "hidden"
		this.container.style.whiteSpace = "pre-wrap"
		this.container.style.wordWrap = "break-word"
		this.container.style.backgroundColor = "transparent"
		this.container.style.zIndex = "1"
		this.container.style.color = "transparent" // Hide original text

		this.shadowRoot.appendChild(this.container)

		this.mount()
		this.syncStyles()

		this.inputElement.addEventListener("scroll", this.syncScroll.bind(this))
		const ro = new ResizeObserver(() => this.syncStyles())
		ro.observe(this.inputElement)
	}

	private mount() {
		const parent = this.inputElement.parentElement
		if (parent) {
			const computedStyle = window.getComputedStyle(parent)
			if (computedStyle.position === "static") {
				parent.style.position = "relative"
			}
			parent.appendChild(this.shadowHost)

			this.shadowHost.style.position = "absolute"
			this.shadowHost.style.pointerEvents = "none"
			this.shadowHost.style.zIndex = "9999"
			// Top/Left set in syncStyles
		}
	}

	private syncStyles() {
		const comp = window.getComputedStyle(this.inputElement)

		// Dimensions and positioning
		this.shadowHost.style.top = this.inputElement.offsetTop + "px"
		this.shadowHost.style.left = this.inputElement.offsetLeft + "px"
		this.shadowHost.style.width = comp.width
		this.shadowHost.style.height = comp.height

		// Typographic and Box Model properties
		const styles = [
			"font-family",
			"font-size",
			"font-weight",
			"font-style",
			"line-height",
			"letter-spacing",
			"text-align",
			"padding-top",
			"padding-right",
			"padding-bottom",
			"padding-left",
			"border-width",
			"box-sizing",
		]

		styles.forEach((prop) => {
			this.container.style.setProperty(prop, comp.getPropertyValue(prop))
		})
	}

	private syncScroll() {
		this.container.scrollTop = this.inputElement.scrollTop
		this.container.scrollLeft = this.inputElement.scrollLeft
	}

	public update(userText: string, suggestion: string) {
		// Only show ghost text if suggestion strictly starts with user text
		// This implies it's a completion or extension
		if (!suggestion.startsWith(userText)) {
			this.hide()
			return
		}

		const suffix = suggestion.slice(userText.length)
		if (!suffix) {
			this.hide()
			return
		}

		// Render: User text (transparent) + Suffix (Gray)
		// We use a span for userText to ensure layout matches exactly up to the cursor point
		this.container.innerHTML = `
            <span style="opacity: 0; color: transparent">${this.escapeHtml(userText)}</span><span style="opacity: 0.5; color: gray">${this.escapeHtml(suffix)}</span>
        `
		this.syncScroll()
		this.visible = true
		this.container.style.display = "block"
	}

	public hide() {
		this.container.style.display = "none"
		this.visible = false
	}

	private escapeHtml(str: string) {
		const div = document.createElement("div")
		div.textContent = str
		return div.innerHTML
	}
}

