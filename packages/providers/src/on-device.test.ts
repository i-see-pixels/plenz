import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { downloadOnDeviceModel, OnDeviceAdapter, onDeviceAvailability } from "./on-device.ts";

type Created = { options: any; destroyed: boolean };

/** A stand-in for Chrome's LanguageModel global. */
function installFake({
  availability = "available",
  chunks = ["Better ", "prompt"],
  fail,
}: { availability?: string; chunks?: string[]; fail?: Error } = {}) {
  const created: Created[] = [];
  (globalThis as any).LanguageModel = {
    availability: async () => availability,
    params: async () => ({ defaultTopK: 3, maxTopK: 128, defaultTemperature: 1, maxTemperature: 2 }),
    create: async (options: any) => {
      const record: Created = { options, destroyed: false };
      created.push(record);
      options.monitor?.({
        addEventListener: (_: string, listener: (e: { loaded: number }) => void) => {
          listener({ loaded: 0.5 });
          listener({ loaded: 1 });
        },
      });
      return {
        promptStreaming: () =>
          new ReadableStream<string>({
            start(controller) {
              if (fail) {
                controller.error(fail);
                return;
              }
              for (const chunk of chunks) controller.enqueue(chunk);
              controller.close();
            },
          }),
        destroy: () => {
          record.destroyed = true;
        },
      };
    },
  };
  return created;
}

const REQUEST = { system: "rules", user: "draft", maxTokens: 100, temperature: 0.4 };

afterEach(() => {
  delete (globalThis as any).LanguageModel;
});

describe("on-device model", () => {
  test("browsers without the API report unavailable", async () => {
    assert.equal(await onDeviceAvailability(), "unavailable");
    const result = await new OnDeviceAdapter().testConnection();
    assert.equal(result.success, false);
  });

  test("streams deltas, sends the system prompt and both sampling params, and frees the session", async () => {
    const created = installFake();
    const deltas: string[] = [];
    const result = await new OnDeviceAdapter().streamCompletion(REQUEST, { apiKey: "", model: "" }, {
      onDelta: (text) => deltas.push(text),
    });
    assert.equal(result.text, "Better prompt");
    assert.deepEqual(deltas, ["Better ", "prompt"]);
    assert.deepEqual(created[0].options.initialPrompts, [{ role: "system", content: "rules" }]);
    assert.equal(created[0].options.temperature, 0.4);
    assert.equal(created[0].options.topK, 3);
    assert.equal(created[0].destroyed, true);
  });

  test("a refine never starts the model download", async () => {
    const created = installFake({ availability: "downloadable" });
    await assert.rejects(
      new OnDeviceAdapter().streamCompletion(REQUEST, { apiKey: "", model: "" }),
      /isn't downloaded yet/,
    );
    assert.equal(created.length, 0);
  });

  test("drafts too long for the context window get a clear message", async () => {
    const quota = Object.assign(new Error("too big"), { name: "QuotaExceededError" });
    const created = installFake({ fail: quota });
    await assert.rejects(
      new OnDeviceAdapter().streamCompletion(REQUEST, { apiKey: "", model: "" }),
      /too long for the on-device model/,
    );
    assert.equal(created[0].destroyed, true);
  });

  test("the settings download reports progress and frees its session", async () => {
    const created = installFake({ availability: "downloadable" });
    const progress: number[] = [];
    await downloadOnDeviceModel((fraction) => progress.push(fraction));
    assert.deepEqual(progress, [0.5, 1]);
    assert.equal(created[0].destroyed, true);
  });

  test("the model is listed only where the device can run it", async () => {
    assert.deepEqual(await new OnDeviceAdapter().fetchModels(), []);
    installFake({ availability: "downloadable" });
    assert.equal((await new OnDeviceAdapter().fetchModels())[0].id, "gemini-nano");
  });
});
