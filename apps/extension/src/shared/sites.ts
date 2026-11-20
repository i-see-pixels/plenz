// Turning plenz on for sites beyond the built-in chat platforms. A site is
// identified by scheme + hostname: Chrome match patterns can't contain a port,
// so one permission covers every port on that host.

/** Prefix for dynamically registered content script ids. */
export const SITE_SCRIPT_PREFIX = "plenz-site:";

export type SiteStatus = "builtin" | "enabled" | "available" | "unsupported";

/** Pages extensions can't script, even with permission. */
const BLOCKED_HOSTS = ["chromewebstore.google.com", "chrome.google.com"];

export type Site = { host: string; pattern: string; scriptId: string };

/** The site a page belongs to, or null for pages plenz can't run on. */
export function siteFor(url: string | undefined): Site | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  const host = parsed.hostname;
  if (!host || BLOCKED_HOSTS.includes(host)) return null;

  const origin = `${parsed.protocol}//${host}`;
  return {
    host,
    pattern: `${origin}/*`,
    scriptId: `${SITE_SCRIPT_PREFIX}${origin}`,
  };
}
