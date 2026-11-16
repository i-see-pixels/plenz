import { useState } from "preact/hooks";
import { Button } from "@plenz/ui/components/button";
import { Skeleton } from "@plenz/ui/components/skeleton";
import { useAuthSession } from "./useAuthSession";

export function AuthStatus() {
  const { auth, apply } = useAuthSession();
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const { user } = auth;
  // Checking, signing in/out or moving keys: the background worker owns the flow.
  const busy = auth.status !== "signedIn" && auth.status !== "signedOut";

  const handleSignIn = () => {
    chrome.runtime
      .sendMessage({ type: "AUTH_SIGN_IN" })
      .then(apply)
      .catch((error) => console.error("plenz: sign-in failed", error));
  };

  const signOut = (keepLocalCopies: boolean) => {
    setConfirmingSignOut(false);
    chrome.runtime
      .sendMessage({ type: "AUTH_SIGN_OUT", payload: { keepLocalCopies } })
      .then(apply)
      .catch((error) => console.error("plenz: sign-out failed", error));
  };

  if (busy) {
    return (
      <div className="flex items-center gap-2 rounded-sm border border-border px-3 py-2">
        <Skeleton className="size-8 rounded-sm" />
        <div className="flex flex-1 flex-col gap-1">
          <Skeleton className="h-3 w-24 rounded-sm" />
          <Skeleton className="h-3 w-16 rounded-sm" />
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex flex-col gap-2 rounded-sm border border-border bg-card px-3 py-2">
        <div className="flex items-center gap-3">
          {user.picture ? (
            <img src={user.picture} alt={user.name} className="size-8 rounded-sm border border-border object-cover" />
          ) : (
            <div className="flex size-8 items-center justify-center rounded-sm border border-border bg-muted text-xs font-semibold text-foreground">
              {user.name?.charAt(0) || user.email?.charAt(0)}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight text-foreground">{user.name}</p>
            <p className="truncate font-mono text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              {user.email}
            </p>
          </div>

          {!confirmingSignOut && (
            <Button variant="outline" size="xs" onClick={() => setConfirmingSignOut(true)} title="Sign out">
              Sign out
            </Button>
          )}
        </div>

        {confirmingSignOut && (
          <div className="flex flex-col gap-2 border-t border-border pt-2">
            <p className="text-xs text-muted-foreground">
              Keep copies of your saved API keys on this device after signing out? They stay in your synced account either way.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="xs" onClick={() => signOut(true)}>
                Keep keys here
              </Button>
              <Button variant="outline" size="xs" onClick={() => signOut(false)}>
                Don't keep
              </Button>
              <Button variant="ghost" size="xs" onClick={() => setConfirmingSignOut(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {auth.error && <p className="text-xs text-accent-signal">{auth.error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Button onClick={handleSignIn} className="w-full justify-center gap-2">
        <svg viewBox="0 0 24 24" aria-hidden="true" data-icon="inline-start">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="currentColor"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="currentColor"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="currentColor"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="currentColor"
          />
        </svg>
        Sign in with Google
      </Button>
      {auth.error && <p className="text-xs text-accent-signal">{auth.error}</p>}
    </div>
  );
}

