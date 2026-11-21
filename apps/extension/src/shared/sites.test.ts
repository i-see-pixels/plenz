import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { siteFor } from "./sites.ts";

describe("siteFor", () => {
  test("http(s) pages map to one pattern per scheme and host", () => {
    assert.deepEqual(siteFor("https://docs.example.com/a/b?q=1#x"), {
      host: "docs.example.com",
      pattern: "https://docs.example.com/*",
      scriptId: "plenz-site:https://docs.example.com",
    });
  });

  test("ports are dropped, since match patterns can't contain one", () => {
    assert.equal(
      siteFor("http://localhost:3000/chat")?.pattern,
      "http://localhost/*",
    );
  });

  test("browser pages, files and the Web Store can't be enabled", () => {
    for (const url of [
      "chrome://extensions",
      "chrome-extension://abc/index.html",
      "file:///C:/notes.txt",
      "about:blank",
      "https://chromewebstore.google.com/detail/x",
      "not a url",
      undefined,
    ]) {
      assert.equal(siteFor(url), null, String(url));
    }
  });
});
