import http from "node:http";
import type { AddressInfo } from "node:net";

export type MockRequest = {
  body: { messages?: Array<{ role: string; content: string }> };
  /** The client closed the connection before the stream finished. */
  aborted: boolean;
  finished: boolean;
};

/** `error` answers with that HTTP status and message instead of a stream. */
export type MockReply = {
  chunks: string[];
  delayMs?: number;
  error?: { status: number; message: string };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A local OpenAI-compatible endpoint that streams scripted replies over SSE,
 * used as the "Custom" provider. Bound to 127.0.0.1, which the extension
 * already has host permission for.
 */
export async function startMockProvider(
  reply: (request: MockRequest) => MockReply,
) {
  const requests: MockRequest[] = [];

  const server = http.createServer(async (req, res) => {
    if (req.method === "GET" && req.url?.endsWith("/models")) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ data: [{ id: "mock-model" }] }));
      return;
    }

    let raw = "";
    for await (const chunk of req) raw += chunk;
    const record: MockRequest = {
      body: JSON.parse(raw || "{}"),
      aborted: false,
      finished: false,
    };
    requests.push(record);

    res.on("close", () => {
      if (!record.finished) record.aborted = true;
    });
    const { chunks, delayMs = 15, error } = reply(record);
    if (error) {
      record.finished = true;
      res.writeHead(error.status, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { message: error.message } }));
      return;
    }
    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
    });

    for (const text of chunks) {
      if (record.aborted) return;
      res.write(
        `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`,
      );
      await sleep(delayMs);
    }
    record.finished = true;
    res.end("data: [DONE]\n\n");
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${port}/v1`,
    requests,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

/** Which refine mode a request is for, from the system prompt the extension sent. */
export function modeOf(request: MockRequest) {
  const system =
    request.body.messages?.find((m) => m.role === "system")?.content ?? "";
  if (system.includes("one question per line")) return "ask";
  if (system.includes("shorter and more direct")) return "tighten";
  if (system.includes("labeled sections")) return "structure";
  if (system.includes("clarifying questions")) return "compose";
  return "improve";
}
