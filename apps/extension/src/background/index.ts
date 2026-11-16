import { handleRefinePort } from "./refine-port"
import { handleMessage } from "./router"
import { Sites } from "./sites"

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	handleMessage(message, sender)
		.then(sendResponse)
		.catch((error) => {
			console.error("Background Error:", error)
			sendResponse({ error: error.message })
		})
	return true // Keep message channel open for async response
})

// Streaming refines use a port so closing it cancels the provider call.
chrome.runtime.onConnect.addListener(handleRefinePort)

// Finishes "Use plenz on this site" even if Chrome closed the popup while asking.
chrome.permissions.onAdded.addListener(({ origins }) => {
	Sites.onPermissionsAdded(origins).catch((error) =>
		console.warn("plenz: enabling site failed", error),
	)
})

console.log("plenz Service Worker active")

