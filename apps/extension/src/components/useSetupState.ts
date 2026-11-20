import type { OnDeviceAvailability } from "@plenz/providers";
import { useEffect, useState } from "preact/hooks";
import { isRpcFailure, sendRpc } from "../shared/rpc";
import { type SetupState, setupState } from "../shared/setup";

/**
 * Whether refines can run, kept live: saving a provider or switching models
 * writes preferences, so any storage change re-checks.
 */
export function useSetupState(): SetupState {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [onDevice, setOnDevice] = useState<OnDeviceAvailability | null>(null);

  useEffect(() => {
    const refresh = () => {
      void sendRpc("GET_ACTIVE_MODEL").then((reply) => {
        setConfigured(
          !isRpcFailure(reply) && "isConfigured" in reply
            ? reply.isConfigured
            : false,
        );
      });
      void sendRpc("GET_ON_DEVICE_STATUS").then((reply) => {
        setOnDevice(isRpcFailure(reply) ? "unavailable" : reply.availability);
      });
    };
    refresh();
    chrome.storage.onChanged.addListener(refresh);
    return () => chrome.storage.onChanged.removeListener(refresh);
  }, []);

  return setupState(configured, onDevice);
}
