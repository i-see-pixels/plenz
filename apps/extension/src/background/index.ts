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

console.log("PromptLens Service Worker active")
