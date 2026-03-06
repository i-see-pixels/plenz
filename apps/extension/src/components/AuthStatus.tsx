import { useState, useEffect } from "preact/hooks";
import type { UserInfo } from "../background/auth";
export function AuthStatus() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    setLoading(true);
    chrome.runtime.sendMessage({ type: "GET_AUTH_STATUS" }, (response) => {
      setUser(response || null);
      setLoading(false);
    });
  };

  const handleSignIn = () => {
    setLoading(true);
    chrome.runtime.sendMessage({ type: "AUTH_SIGN_IN" }, (response) => {
      setUser(response || null);
      setLoading(false);
    });
  };

  const handleSignOut = () => {
    setLoading(true);
    chrome.runtime.sendMessage({ type: "AUTH_SIGN_OUT" }, (success) => {
      if (success) {
        setUser(null);
      }
      setLoading(false);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="animate-pulse w-8 h-8 bg-gray-200 rounded-full" />
        <div className="animate-pulse w-24 h-4 bg-gray-200 rounded" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-3 px-1">
        {user.picture ? (
          <img
            src={user.picture}
            alt={user.name}
            className="w-7 h-7 rounded-sm"
          />
        ) : (
          <div className="w-7 h-7 rounded-sm bg-gray-200 flex items-center justify-center text-black font-bold text-xs">
            {user.name?.charAt(0) || user.email?.charAt(0)}
          </div>
        )}
        <div className="flex flex-col flex-1">
          <span className="text-sm font-bold tracking-tight text-black leading-tight flex items-center gap-1">
            {user.name}
          </span>
          <span className="text-[10px] font-mono tracking-widest uppercase text-gray-500">
            {user.email?.split("@")[0]}
          </span>
        </div>
        <button
          onClick={handleSignOut}
          className="ml-2 px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-gray-500 hover:text-black border border-transparent hover:border-gray-300 rounded-sm transition-colors"
          title="Sign Out"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleSignIn}
      className="flex items-center justify-center gap-2 w-full py-2 bg-white border border-gray-300 text-black hover:bg-gray-50 font-bold text-sm tracking-tight transition-colors"
    >
      <svg className="w-4 h-4 grayscale" viewBox="0 0 24 24">
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
    </button>
  );
}
