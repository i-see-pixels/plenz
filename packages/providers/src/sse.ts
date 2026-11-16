// Server-sent events, as used by the OpenAI, Anthropic and Gemini streaming
// APIs. The parser is pure (feed it text chunks) so it can be tested; readSSE
// wires it to a fetch response body.

export type SSEEvent = { event?: string; data: string };

/**
 * Returns a function to feed raw text chunks into. Chunks may split lines
 * or events anywhere; complete events are passed to `onEvent`.
 */
export function createSSEParser(onEvent: (event: SSEEvent) => void) {
  let buffer = "";
  let eventName: string | undefined;
  let dataLines: string[] = [];

  const dispatch = () => {
    if (dataLines.length > 0) onEvent({ event: eventName, data: dataLines.join("\n") });
    eventName = undefined;
    dataLines = [];
  };

  const processLine = (line: string) => {
    if (line === "") {
      dispatch();
      return;
    }
    if (line.startsWith(":")) return; // comment / keep-alive
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "data") dataLines.push(value);
    else if (field === "event") eventName = value;
  };

  return {
    push(chunk: string) {
      buffer += chunk;
      const lines = buffer.split(/\r\n|\r|\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) processLine(line);
    },
    /** Call when the stream ends, to emit a final event with no trailing blank line. */
    end() {
      if (buffer) processLine(buffer);
      buffer = "";
      dispatch();
    },
  };
}

export async function readSSE(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: SSEEvent) => void,
) {
  const parser = createSSEParser(onEvent);
  const reader = body.getReader();
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parser.push(decoder.decode(value, { stream: true }));
    }
    parser.push(decoder.decode());
    parser.end();
  } finally {
    reader.releaseLock();
  }
}

export function isEventStream(res: Response) {
  return (res.headers.get("content-type") ?? "").includes("text/event-stream");
}
