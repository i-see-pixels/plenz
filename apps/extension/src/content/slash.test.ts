import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  MAX_SLASH_RESULTS,
  matchSlashItems,
  parseSlashQuery,
  replaceSlashCommand,
  type SlashItem,
} from "./slash.ts";

describe("parseSlashQuery", () => {
  test("a slash at the start of the draft or of its last line", () => {
    assert.equal(parseSlashQuery("/"), "");
    assert.equal(parseSlashQuery("/launch em"), "launch em");
    assert.equal(parseSlashQuery("Some context\n/about"), "about");
    assert.equal(parseSlashQuery("/about\n"), "about");
  });

  test("not a command", () => {
    for (const draft of [
      "",
      "write an email",
      "use a/b testing",
      "/about\nmore text",
      "/ a slash then a space",
      "/usr/bin/env",
      `/${"x".repeat(31)}`,
    ]) {
      assert.equal(parseSlashQuery(draft), null, draft);
    }
  });
});

describe("replaceSlashCommand", () => {
  test("replaces only the command line", () => {
    assert.equal(replaceSlashCommand("/lau", " Launch email prompt "), "Launch email prompt");
    assert.equal(
      replaceSlashCommand("Context first\n/ab\n", "About me"),
      "Context first\nAbout me",
    );
  });

  test("leaves a draft without a command alone", () => {
    assert.equal(replaceSlashCommand("no command", "x"), "no command");
  });
});

describe("matchSlashItems", () => {
  const item = (id: string, title: string, text = `${title} text`, source: SlashItem["source"] = "saved") =>
    ({ id, title, text, source }) as SlashItem;
  const items = [
    item("c1", "About me", "I'm a PM", "card"),
    item("s1", "Code review checklist"),
    item("s2", "Weekly review"),
    item("g1", "Launch email", "Write a launch email for {product}", "gallery"),
  ];
  const ids = (list: SlashItem[]) => list.map((entry) => entry.id);

  test("an empty query lists everything in source order", () => {
    assert.deepEqual(ids(matchSlashItems(items, "")), ["c1", "s1", "s2", "g1"]);
  });

  test("title prefix beats word prefix beats substring beats text", () => {
    assert.deepEqual(ids(matchSlashItems(items, "rev")), ["s1", "s2"]);
    assert.deepEqual(ids(matchSlashItems(items, "review")), ["s1", "s2"]);
    assert.deepEqual(ids(matchSlashItems(items, "WEEK")), ["s2"]);
    assert.deepEqual(ids(matchSlashItems(items, "pm")), ["c1"]);
    assert.deepEqual(ids(matchSlashItems(items, "zzz")), []);
  });

  test("the same prompt from two sources shows once, and results are capped", () => {
    const dupes = [item("s", "Launch", "same"), item("g", "Launch", "same", "gallery")];
    assert.deepEqual(ids(matchSlashItems(dupes, "")), ["s"]);
    const many = Array.from({ length: 20 }, (_, i) => item(String(i), `Prompt ${i}`));
    assert.equal(matchSlashItems(many, "").length, MAX_SLASH_RESULTS);
  });
});
