import { handleRefinePort } from "./refine-port"
import { handleMessage } from "./router"

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

console.log("plenz Service Worker active")

