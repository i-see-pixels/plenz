import { useState } from "preact/hooks";
import { Button } from "@plenz/ui/components/button";
import { Input } from "@plenz/ui/components/input";
import { isRpcFailure, sendRpc } from "../shared/rpc";
import type { VaultStatus } from "../background/sync-vault";

const MIN_LENGTH = 10;

type Props = {
  status: VaultStatus | null;
  /** Cloud Sync is the active method (keys may already be stored there). */
  cloudSyncActive: boolean;
  onChanged: () => void;
};

type Form = "none" | "change" | "reset";

/**
 * The passphrase that encrypts synced API keys end to end. plenz and Firebase
 * only ever store the encrypted keys; the passphrase stays with the user.
 */
export function SyncPassphrase({ status, cloudSyncActive, onChanged }: Props) {
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [current, setCurrent] = useState("");
  const [form, setForm] = useState<Form>("none");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "muted" | "error"; text: string } | null>(null);

  if (status !== "not-set-up" && status !== "locked" && status !== "unlocked") return null;

  const clear = () => {
    setPassphrase("");
    setConfirm("");
    setCurrent("");
  };

  const run = async (
    action: () => ReturnType<typeof sendRpc<"SET_UP_SYNC_VAULT">>,
    success: (upgraded?: number) => string,
  ) => {
    setBusy(true);
    setMessage(null);
    try {
      const reply = await action();
      if (isRpcFailure(reply) || !reply.success) {
        setMessage({ tone: "error", text: ("error" in reply && reply.error) || "That didn't work." });
        return;
      }
      clear();
      setForm("none");
      setMessage({ tone: "muted", text: success(reply.upgraded) });
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const upgradedNote = (upgraded?: number) =>
    upgraded ? ` Re-encrypted ${upgraded} saved key${upgraded === 1 ? "" : "s"} with it.` : "";

  const newPassphraseProblem =
    passphrase.length > 0 && passphrase.length < MIN_LENGTH
      ? `Use at least ${MIN_LENGTH} characters.`
      : confirm.length > 0 && confirm !== passphrase
        ? "The two passphrases don't match."
        : null;
  const newPassphraseReady = passphrase.length >= MIN_LENGTH && confirm === passphrase;

  const field = (
    id: string,
    label: string,
    value: string,
    onInput: (value: string) => void,
    autoComplete: string,
  ) => (
    <label htmlFor={id} className="flex flex-col gap-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <Input
        id={id}
        type="password"
        autoComplete={autoComplete}
        value={value}
        onInput={(e) => onInput((e.target as HTMLInputElement).value)}
      />
    </label>
  );

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <p className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
        Sync passphrase
      </p>

      {status === "not-set-up" ? (
        <>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Cloud Sync encrypts your API keys with a passphrase only you know. plenz and Firebase
            can't read them, and the passphrase can't be recovered, so keep it somewhere safe.
            {cloudSyncActive
              ? " Your keys already in Cloud Sync use the older account-based encryption until you set one."
              : ""}
          </p>
          {field("sync-pass", "Passphrase", passphrase, setPassphrase, "new-password")}
          {field("sync-pass-confirm", "Confirm passphrase", confirm, setConfirm, "new-password")}
          {newPassphraseProblem ? (
            <p className="text-xs text-accent-signal">{newPassphraseProblem}</p>
          ) : null}
          <Button
            className="self-start"
            disabled={busy || !newPassphraseReady}
            onClick={() =>
              void run(
                () => sendRpc("SET_UP_SYNC_VAULT", { passphrase }),
                (upgraded) => `Passphrase set. This device is unlocked.${upgradedNote(upgraded)}`,
              )
            }
          >
            {busy ? "Setting up…" : "Set passphrase"}
          </Button>
        </>
      ) : status === "locked" ? (
        form === "reset" ? (
          <>
            <p className="text-xs leading-relaxed text-accent-signal">
              Without the passphrase, the keys in Cloud Sync can't be decrypted by anyone. Resetting
              deletes them; you'll set a new passphrase and enter your keys again.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="destructive"
                size="xs"
                disabled={busy}
                onClick={() =>
                  void run(
                    () => sendRpc("RESET_SYNC_VAULT"),
                    () => "Cloud Sync keys deleted. Set a new passphrase to continue.",
                  )
                }
              >
                Delete synced keys and reset
              </Button>
              <Button variant="ghost" size="xs" onClick={() => setForm("none")}>
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Cloud Sync is locked on this device. Enter your sync passphrase to use your synced
              keys here.
            </p>
            {field("sync-unlock", "Passphrase", passphrase, setPassphrase, "current-password")}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                disabled={busy || passphrase.length === 0}
                onClick={() =>
                  void run(
                    () => sendRpc("UNLOCK_SYNC_VAULT", { passphrase }),
                    (upgraded) => `Unlocked on this device.${upgradedNote(upgraded)}`,
                  )
                }
              >
                {busy ? "Unlocking…" : "Unlock"}
              </Button>
              <Button variant="link" size="xs" onClick={() => setForm("reset")}>
                Forgot it?
              </Button>
            </div>
          </>
        )
      ) : form === "change" ? (
        <>
          {field("sync-current", "Current passphrase", current, setCurrent, "current-password")}
          {field("sync-new", "New passphrase", passphrase, setPassphrase, "new-password")}
          {field("sync-new-confirm", "Confirm new passphrase", confirm, setConfirm, "new-password")}
          {newPassphraseProblem ? (
            <p className="text-xs text-accent-signal">{newPassphraseProblem}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              size="xs"
              disabled={busy || !newPassphraseReady || current.length === 0}
              onClick={() =>
                void run(
                  () => sendRpc("CHANGE_SYNC_PASSPHRASE", { current, next: passphrase }),
                  () => "Passphrase changed. Other devices stay unlocked; new ones use the new passphrase.",
                )
              }
            >
              Change passphrase
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                clear();
                setForm("none");
              }}
            >
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Your synced API keys are encrypted with your passphrase. This device is unlocked.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="xs" onClick={() => setForm("change")}>
              Change passphrase
            </Button>
            <Button
              variant="ghost"
              size="xs"
              disabled={busy}
              onClick={() =>
                void run(
                  () => sendRpc("LOCK_SYNC_VAULT"),
                  () => "Locked. Enter the passphrase to use synced keys here again.",
                )
              }
            >
              Lock this device
            </Button>
          </div>
        </>
      )}

      {message ? (
        <p
          className={
            message.tone === "error"
              ? "text-xs text-accent-signal"
              : "text-xs leading-relaxed text-muted-foreground"
          }
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
