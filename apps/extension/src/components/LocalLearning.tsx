import {
  LINT_CHECK_LABELS,
  type LintCheckId,
  REFINE_MODE_LABELS,
} from "@plenz/core";
import { Button } from "@plenz/ui/components/button";
import { useEffect, useState } from "preact/hooks";
import {
  emptyLearning,
  hiddenChecks,
  LEARNING_STORAGE_KEY,
  type Learning,
  normalizeLearning,
  preferredMode,
} from "../shared/learning";
import { isRpcFailure, sendRpc } from "../shared/rpc";

/** What plenz has picked up from use on this device, and a way to forget it. */
export function LocalLearning() {
  const [learning, setLearning] = useState<Learning>(emptyLearning());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void chrome.storage.local
      .get(LEARNING_STORAGE_KEY)
      .then((stored) =>
        setLearning(normalizeLearning(stored[LEARNING_STORAGE_KEY])),
      );
    const onChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area === "local" && changes[LEARNING_STORAGE_KEY]) {
        setLearning(normalizeLearning(changes[LEARNING_STORAGE_KEY].newValue));
      }
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => chrome.storage.onChanged.removeListener(onChange);
  }, []);

  const reset = async () => {
    setError(null);
    const reply = await sendRpc("RESET_LEARNING");
    if (isRpcFailure(reply)) setError(reply.error);
  };

  const mode = preferredMode(learning);
  const hidden = [...hiddenChecks(learning)];
  const empty =
    Object.keys(learning.modes).length === 0 &&
    Object.keys(learning.checks).length === 0;

  return (
    <div className="grid gap-3 px-3 py-3 text-sm">
      <p className="text-xs leading-relaxed text-muted-foreground">
        plenz notices which refine results you keep and which prompt checks you
        send past, and adjusts: the mode you accept most becomes the suggested
        one, and a check you keep ignoring stops being shown. This stays on this
        device and is never sent anywhere.
      </p>
      <dl className="grid gap-2 sm:grid-cols-[220px_1fr]">
        <dt className="font-mono text-[11px] tracking-[0.14em] uppercase">
          Suggested mode
        </dt>
        <dd>{mode ? REFINE_MODE_LABELS[mode] : "Not learned yet (Improve)"}</dd>
        <dt className="font-mono text-[11px] tracking-[0.14em] uppercase">
          Hidden checks
        </dt>
        <dd>
          {hidden.length > 0
            ? hidden
                .map((id) => LINT_CHECK_LABELS[id as LintCheckId] ?? id)
                .join(", ")
            : "None"}
        </dd>
      </dl>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" disabled={empty} onClick={reset}>
          Forget what plenz learned
        </Button>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    </div>
  );
}
