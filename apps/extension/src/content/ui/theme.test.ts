import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { Window } from "happy-dom";
import { isDarkBehind, luminance, parseColor } from "./theme.ts";

function input(html: string, style = "") {
  const window = new Window({ url: "https://chatgpt.com/" });
  window.document.head.innerHTML = `<style>${style}</style>`;
  window.document.body.innerHTML = html;
  return window.document.getElementById("composer") as unknown as Element;
}

describe("page theme", () => {
  test("parses rgb and rgba colors", () => {
    assert.deepEqual(parseColor("rgb(33, 33, 33)"), [33, 33, 33, 1]);
    assert.deepEqual(parseColor("rgba(0, 0, 0, 0)"), [0, 0, 0, 0]);
    assert.deepEqual(parseColor("rgb(10 20 30 / 50%)"), [10, 20, 30, 0.5]);
    assert.equal(parseColor("transparent"), null);
    assert.ok(luminance([255, 255, 255, 1]) > 0.99);
    assert.ok(luminance([33, 33, 33, 1]) < 0.05);
  });

  test("dark when the nearest opaque background behind the chat box is dark", () => {
    assert.equal(
      isDarkBehind(input(`<main style="background:#212121"><div><textarea id="composer"></textarea></div></main>`)),
      true,
    );
  });

  test("light for light or transparent pages", () => {
    assert.equal(
      isDarkBehind(input(`<main style="background:#ffffff"><textarea id="composer"></textarea></main>`)),
      false,
    );
    assert.equal(isDarkBehind(input(`<textarea id="composer"></textarea>`)), false);
  });

  test("a translucent dark overlay doesn't count; the solid page behind it does", () => {
    assert.equal(
      isDarkBehind(
        input(`<main style="background:#fafafa"><div style="background:rgba(0,0,0,0.1)"><textarea id="composer"></textarea></div></main>`),
      ),
      false,
    );
  });
});
