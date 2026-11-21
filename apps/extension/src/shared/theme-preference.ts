// plenz's own pages (popup, settings, welcome, gallery) follow the theme
// preference in settings. The in-page overlays don't: they follow the chat
// site they sit on (see ../content/ui/theme.ts).

export type ThemePreference = "light" | "dark" | "system";

/** Last applied preference, so a page can paint in the right theme at once. */
const CACHE_KEY = "plenz-theme";

export function parseThemePreference(value: unknown): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

export function isDarkTheme(preference: ThemePreference, systemDark: boolean) {
  return preference === "dark" || (preference === "system" && systemDark);
}

/**
 * Apply the theme preference to this page and keep it applied: when the
 * setting changes (on any device, via sync) or the OS theme flips.
 */
export function followThemePreference() {
  const root = document.documentElement;
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  let preference = parseThemePreference(readCache());

  const apply = () => {
    const dark = isDarkTheme(preference, media.matches);
    root.classList.toggle("dark", dark);
    root.style.colorScheme = dark ? "dark" : "light";
  };
  const set = (value: unknown) => {
    preference = parseThemePreference(value);
    writeCache(preference);
    apply();
  };

  apply();
  media.addEventListener("change", apply);
  void chrome.storage.sync
    .get("preferences")
    .then((stored) =>
      set((stored.preferences as { theme?: unknown } | undefined)?.theme),
    );
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.preferences) {
      set(
        (changes.preferences.newValue as { theme?: unknown } | undefined)
          ?.theme,
      );
    }
  });
}

function readCache() {
  try {
    return localStorage.getItem(CACHE_KEY);
  } catch {
    return null;
  }
}

function writeCache(preference: ThemePreference) {
  try {
    localStorage.setItem(CACHE_KEY, preference);
  } catch {
    // Without storage the page still follows the setting, just a moment later.
  }
}
