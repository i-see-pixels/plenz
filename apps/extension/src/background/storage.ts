import { ProviderConfig } from "@promptlens/types"
import { providers } from "@promptlens/providers"

export interface UserPreferences {
	debounceTime: number
	activeModelId: string | null
	theme: "light" | "dark" | "system"
}

const DEFAULT_PREFERENCES: UserPreferences = {
	debounceTime: 500,
	activeModelId: null,
	theme: "system",
}

export const StorageManager = {
	async getPreferences(): Promise<UserPreferences> {
		const data = await chrome.storage.local.get("preferences")
		return {
			...DEFAULT_PREFERENCES,
			...(data.preferences || {}),
		}
	},

	async setPreferences(prefs: Partial<UserPreferences>): Promise<void> {
		const current = await this.getPreferences()
		const updated = { ...current, ...prefs }
		await chrome.storage.local.set({
			preferences: updated,
		})
	},

	async getModelConfig(providerId: string): Promise<ProviderConfig | null> {
		const key = `model_config_${providerId}`
		const data = await chrome.storage.local.get(key)
		return (data[key] as ProviderConfig) || null
	},

	async setModelConfig(
		providerId: string,
		config: ProviderConfig,
	): Promise<void> {
		const key = `model_config_${providerId}`
		await chrome.storage.local.set({ [key]: config })
	},

	async getActiveModelConfig(): Promise<ProviderConfig | null> {
		const { activeModelId } = await this.getPreferences()
		if (!activeModelId) return null

		// Find which provider owns this model
		const provider = providers.find((p) =>
			p.models.some((m) => m.id === activeModelId),
		)

		if (!provider) return null
		const config = await this.getModelConfig(provider.id)

		if (!config) return null

		// CRITICAL: Override the stored model in config with the activeModelId
		// This ensures that switching models in the popup (which updates activeModelId)
		// actually changes the model used for analysis.
		return { ...config, model: activeModelId }
	},
}
