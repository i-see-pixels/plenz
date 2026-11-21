import {
  downloadOnDeviceModel,
  type OnDeviceAvailability,
} from "@plenz/providers";
import { Button } from "@plenz/ui/components/button";
import { useCallback, useEffect, useState } from "preact/hooks";
import { isRpcFailure, sendRpc } from "../shared/rpc";

/**
 * Settings panel for Chrome's built-in Gemini Nano. Status comes from the
 * background worker (where refines run); the download runs here because
 * Chrome needs the user's click to start it.
 */
export function OnDeviceModel() {
  const [status, setStatus] = useState<{
    availability: OnDeviceAvailability;
    message: string;
  } | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const reply = await sendRpc("GET_ON_DEVICE_STATUS");
    if (!isRpcFailure(reply)) setStatus(reply);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const download = async () => {
    setError(null);
    setProgress(0);
    try {
      await downloadOnDeviceModel((fraction) => setProgress(fraction));
    } catch (e) {
      setError((e as Error).message || "The download didn't start.");
    } finally {
      setProgress(null);
      await refresh();
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-sm border border-border bg-card px-3 py-3 text-sm">
      <p className="leading-relaxed">
        Refines run on this device with Chrome's built-in model: no API key, and
        your prompt never leaves the browser. Results are simpler than with
        large hosted models.
      </p>
      {status ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {status.message}
        </p>
      ) : null}

      {progress !== null ? (
        <p className="font-mono text-xs">
          Downloading… {Math.round(progress * 100)}%
        </p>
      ) : status?.availability === "downloadable" ? (
        <div className="flex flex-col gap-1">
          <Button onClick={() => void download()} className="self-start">
            Download model
          </Button>
          <p className="text-xs leading-relaxed text-muted-foreground">
            One-time download of a few GB. Chrome needs about 22 GB free on the
            drive with your profile.
          </p>
        </div>
      ) : status?.availability === "downloading" ? (
        <Button
          variant="outline"
          size="xs"
          className="self-start"
          onClick={() => void refresh()}
        >
          Check again
        </Button>
      ) : null}

      {error ? <p className="text-xs text-accent-signal">{error}</p> : null}
    </div>
  );
}
