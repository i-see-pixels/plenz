import { useEffect, useState } from "preact/hooks";
import type { AuthSnapshot } from "../background/auth-machine";

const INITIAL: AuthSnapshot = { status: "checking", user: null, version: 0 };

function isAuthSnapshot(value: unknown): value is AuthSnapshot {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as AuthSnapshot).status === "string" &&
    typeof (value as AuthSnapshot).version === "number"
  );
}

/**
 * The background worker's auth session, kept live on this page.
 * Also returns `apply` so a page can show the reply to its own request
 * without waiting for the broadcast.
 */
export function useAuthSession() {
  const [auth, setAuth] = useState<AuthSnapshot>(INITIAL);

  // Replies and broadcasts can arrive out of order; keep the newest.
  const apply = (next: unknown) => {
    if (isAuthSnapshot(next)) {
      setAuth((current) => (next.version >= current.version ? next : current));
    }
  };

  useEffect(() => {
    const listener = (message: { type?: string; payload?: unknown }) => {
      if (message?.type === "AUTH_STATE_CHANGED") apply(message.payload);
    };

    chrome.runtime.onMessage.addListener(listener);
    chrome.runtime
      .sendMessage({ type: "GET_AUTH_STATE" })
      .then(apply)
      .catch((error) => console.error("plenz: failed to read auth state", error));

    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  return { auth, apply };
}
