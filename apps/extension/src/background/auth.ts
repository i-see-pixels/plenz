export const AuthManager = {
	async signIn(): Promise<{ name: string; email: string; avatar: string }> {
		// Placeholder for chrome.identity.launchWebAuthFlow
		console.log("Google Sign-In requested")
		return {
			name: "Demo User",
			email: "demo@example.com",
			avatar: "",
		}
	},

	async signOut(): Promise<void> {
		console.log("User signed out")
	},

	async getUserInfo() {
		// Placeholder
		return null
	},
}
