import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createSSEParser, readSSE, type SSEEvent } from "./sse.ts";

function parseAll(chunks: string[]) {
  const events: SSEEvent[] = [];
  const parser = createSSEParser((event) => events.push(event));
  for (const chunk of chunks) parser.push(chunk);
  parser.end();
  return events;
}

describe("createSSEParser", () => {
  test("parses data events and event names", () => {
    assert.deepEqual(
      parseAll(['event: content_block_delta\ndata: {"a":1}\n\n', "data: [DONE]\n\n"]),
      [
        { event: "content_block_delta", data: '{"a":1}' },
        { event: undefined, data: "[DONE]" },
      ],
    );
  });

  test("handles chunks split mid-line and CRLF line endings", () => {
    assert.deepEqual(parseAll(["da", 'ta: {"x"', ':2}\r', "\n\r\ndata: b\r\n\r\n"]), [
      { event: undefined, data: '{"x":2}' },
      { event: undefined, data: "b" },
    ]);
  });

  test("ignores comments and joins multi-line data", () => {
    assert.deepEqual(parseAll([": keep-alive\n\ndata: one\ndata: two\n\n"]), [
      { event: undefined, data: "one\ntwo" },
    ]);
  });

  test("emits a final event without a trailing blank line", () => {
    assert.deepEqual(parseAll(["data: last"]), [{ event: undefined, data: "last" }]);
  });
});

describe("readSSE", () => {
  test("reads a byte stream, including multi-byte characters split across chunks", async () => {
    const bytes = new TextEncoder().encode("data: café\n\ndata: ok\n\n");
    const split = bytes.indexOf(0xc3) + 1; // inside the two-byte "é"
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, split));
        controller.enqueue(bytes.slice(split));
        controller.close();
      },
    });
    const events: string[] = [];
    await readSSE(body, (event) => events.push(event.data));
    assert.deepEqual(events, ["café", "ok"]);
  });
});
