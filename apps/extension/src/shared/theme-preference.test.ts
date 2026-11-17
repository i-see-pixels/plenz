import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { isDarkTheme, parseThemePreference } from "./theme-preference.ts";

describe("theme preference", () => {
  test("anything unknown means follow the system", () => {
    assert.equal(parseThemePreference("dark"), "dark");
    assert.equal(parseThemePreference("light"), "light");
    assert.equal(parseThemePreference("system"), "system");
    assert.equal(parseThemePreference(undefined), "system");
    assert.equal(parseThemePreference("purple"), "system");
  });

  test("light and dark ignore the OS; system follows it", () => {
    assert.equal(isDarkTheme("dark", false), true);
    assert.equal(isDarkTheme("light", true), false);
    assert.equal(isDarkTheme("system", true), true);
    assert.equal(isDarkTheme("system", false), false);
  });
});
