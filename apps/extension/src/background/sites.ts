import { findPlatformAdapter } from "../content/editors/platforms";
import { siteFor, type SiteStatus } from "../shared/sites";

/**
 * The content script as one self-contained file, built by
 * vite.site-script.config.ts. Injected directly, so it needs no
 * web_accessible_resources. Its name is fixed, so registrations stay valid
 * across extension updates.
 */
const contentScript = "site-content-script.js";

const PENDING_KEY = "pendingSiteEnable";
/** A permission granted later than this after asking isn't ours to act on. */
const PENDING_TTL_MS = 5 * 60_000;

type PendingSite = { url: string; pattern: string; tabId?: number; at: number };

/**
 * Sites the user turned plenz on for from the popup. Each one is a
 * registered content script plus an optional host permission for that site
 * only; nothing runs on sites the user didn't enable.
 */
export const Sites = {
  async status(url: string): Promise<{ status: SiteStatus; host?: string }> {
    const site = siteFor(url);
    if (!site) return { status: "unsupported" };
    if (findPlatformAdapter(site.host)) return { status: "builtin", host: site.host };

    const [registered, granted] = await Promise.all([
      chrome.scripting.getRegisteredContentScripts({ ids: [site.scriptId] }),
      chrome.permissions.contains({ origins: [site.pattern] }),
    ]);
    return {
      status: registered.length > 0 && granted ? "enabled" : "available",
      host: site.host,
    };
  },

  /** The popup asks for the permission first (it needs the user's click). */
  async enable(url: string, tabId?: number): Promise<{ success: boolean; error?: string }> {
    const site = siteFor(url);
    if (!site || findPlatformAdapter(site.host)) {
      return { success: false, error: "plenz can't be turned on for this page." };
    }
    if (!(await chrome.permissions.contains({ origins: [site.pattern] }))) {
      return { success: false, error: "Chrome didn't grant access to this site." };
    }

    const script = {
      id: site.scriptId,
      matches: [site.pattern],
      js: [contentScript],
      runAt: "document_idle" as const,
      persistAcrossSessions: true,
    };
    const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [site.scriptId] });
    if (existing.length > 0) await chrome.scripting.updateContentScripts([script]);
    else await chrome.scripting.registerContentScripts([script]);

    // Start right away in the open tab instead of waiting for a reload.
    if (tabId !== undefined) {
      await chrome.scripting
        .executeScript({ target: { tabId }, files: [contentScript] })
        .catch((error) => console.warn("plenz: couldn't start on the open tab", error));
    }
    return { success: true };
  },

  /**
   * Chrome can close the popup while its permission prompt is open, so the
   * popup records the site first and `onPermissionsAdded` finishes the job.
   */
  async markPending(url: string, tabId?: number) {
    const site = siteFor(url);
    if (!site) return { success: false, error: "Unknown site." };
    const pending: PendingSite = { url, pattern: site.pattern, tabId, at: Date.now() };
    await chrome.storage.session.set({ [PENDING_KEY]: pending });
    return { success: true };
  },

  async onPermissionsAdded(origins: string[] = []) {
    const pending = (await chrome.storage.session.get(PENDING_KEY))[PENDING_KEY] as
      | PendingSite
      | undefined;
    if (!pending || Date.now() - pending.at > PENDING_TTL_MS) return;
    if (!origins.includes(pending.pattern)) return;
    await chrome.storage.session.remove(PENDING_KEY);
    await Sites.enable(pending.url, pending.tabId);
  },

  /** Stops future page loads; a page that's already open keeps it until reload. */
  async disable(url: string): Promise<{ success: boolean; error?: string }> {
    const site = siteFor(url);
    if (!site) return { success: false, error: "Unknown site." };
    await chrome.scripting
      .unregisterContentScripts({ ids: [site.scriptId] })
      .catch(() => {}); // Not registered: nothing to undo.
    await chrome.permissions.remove({ origins: [site.pattern] });
    return { success: true };
  },
};
