import { useEffect, useState } from "preact/hooks";
import type { UserInfo } from "../background/auth";
import { Button } from "@promptlens/ui/components/button";
import { Skeleton } from "@promptlens/ui/components/skeleton";

function dispatchAuthChanged(user: UserInfo | null) {
  window.dispatchEvent(
    new CustomEvent("promptlens-auth-status-changed", {
      detail: { user },
    }),
  );
}

function isUserInfo(value: unknown): value is UserInfo {
  return (
    !!value &&
    typeof value === "object" &&
    "email" in value &&
    "name" in value
  );
}

export function AuthStatus() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    setLoading(true);
    chrome.runtime.sendMessage({ type: "GET_AUTH_STATUS" }, (response) => {
      const nextUser = isUserInfo(response) ? response : null;
      setUser(nextUser);
      dispatchAuthChanged(nextUser);
      setLoading(false);
    });
  };

  const handleSignIn = () => {
    setLoading(true);
    chrome.runtime.sendMessage({ type: "AUTH_SIGN_IN" }, (response) => {
      const nextUser = isUserInfo(response) ? response : null;
      setUser(nextUser);
      if (nextUser) {
        chrome.runtime.sendMessage({ type: "MIGRATE_KEYS_TO_SYNC" }, () => {
          dispatchAuthChanged(nextUser);
          setLoading(false);
        });
        return;
      }

      dispatchAuthChanged(null);
      setLoading(false);
    });
  };

  const handleSignOut = () => {
    const keepLocalCopies = window.confirm(
      "Sign out and keep local copies of your saved API keys on this device?",
    );
    if (!keepLocalCopies) {
      return;
    }

    setLoading(true);
    chrome.runtime.sendMessage(
      { type: "CACHE_MODEL_CONFIGS_LOCALLY" },
      () => {
        chrome.runtime.sendMessage({ type: "AUTH_SIGN_OUT" }, (success) => {
          if (success) {
            setUser(null);
            dispatchAuthChanged(null);
          }
          setLoading(false);
        });
      },
    );
  };

  if (loading) {
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
      <div className="flex items-center gap-3 rounded-sm border border-border bg-card px-3 py-2">
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

        <Button variant="outline" size="xs" onClick={handleSignOut} title="Sign out">
          Sign out
        </Button>
      </div>
    );
  }

  return (
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
  );
}
