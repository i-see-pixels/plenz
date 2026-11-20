import { Button } from "@plenz/ui/components/button";
import { useCallback, useEffect, useState } from "preact/hooks";
import { isRpcFailure, sendRpc } from "../shared/rpc";
import { type SiteStatus, siteFor } from "../shared/sites";

type Tab = { id?: number; url?: string };

/**
 * "Use plenz on this site" for the current tab. Chrome asks for access to
 * that one site only; nothing runs on sites the user didn't turn on.
 */
export function SiteAccess() {
  const [tab, setTab] = useState<Tab | null>(null);
  const [status, setStatus] = useState<SiteStatus | null>(null);
  const [host, setHost] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async (url: string | undefined) => {
    if (!url) {
      setStatus("unsupported");
      return;
    }
    const reply = await sendRpc("GET_SITE_STATUS", { url });
    if (isRpcFailure(reply)) {
      setStatus("unsupported");
      return;
    }
    setStatus(reply.status);
    setHost(reply.host);
  }, []);

  useEffect(() => {
    // activeTab lets the popup read this tab's URL; no "tabs" permission needed.
    void chrome.tabs
      .query({ active: true, currentWindow: true })
      .then(([active]) => {
        const current = { id: active?.id, url: active?.url };
        setTab(current);
        void refresh(current.url);
      });
  }, [refresh]);

  const enable = async () => {
    const site = siteFor(tab?.url);
    if (!tab?.url || !site) return;
    setBusy(true);
    setMessage(null);
    try {
      await sendRpc("SITE_PERMISSION_REQUESTED", {
        url: tab.url,
        tabId: tab.id,
      });
      const granted = await chrome.permissions.request({
        origins: [site.pattern],
      });
      if (!granted) {
        setMessage("Access wasn't granted, so plenz stays off here.");
        return;
      }
      const reply = await sendRpc("ENABLE_SITE", {
        url: tab.url,
        tabId: tab.id,
      });
      if (isRpcFailure(reply) || !reply.success) {
        setMessage(
          ("error" in reply && reply.error) ||
            "Couldn't turn plenz on for this site.",
        );
      }
      await refresh(tab.url);
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (!tab?.url) return;
    setBusy(true);
    try {
      await sendRpc("DISABLE_SITE", { url: tab.url });
      setMessage("Turned off. Reload the page to remove it from this tab.");
      await refresh(tab.url);
    } finally {
      setBusy(false);
    }
  };

  if (!status || status === "unsupported") return null;

  return (
    <section className="flex flex-col gap-2 px-4 py-3">
      <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
        This site
      </p>
      {status === "builtin" ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          plenz is built in for {host}.
        </p>
      ) : status === "enabled" ? (
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-xs">On for {host}</p>
          <Button
            variant="outline"
            size="xs"
            onClick={() => void disable()}
            disabled={busy}
          >
            Turn off
          </Button>
        </div>
      ) : (
        <>
          <Button
            onClick={() => void enable()}
            disabled={busy}
            className="w-full"
          >
            Use plenz on {host}
          </Button>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Works in the text box you click into. Chrome will ask for access to
            this site only.
          </p>
        </>
      )}
      {message ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {message}
        </p>
      ) : null}
    </section>
  );
}
