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
      <div className="flex items-center gap-3">
        {user.picture ? (
          <img
            src={user.picture}
            alt={user.name}
            className="w-8 h-8 rounded-full shadow-sm"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shadow-sm">
            {user.name?.charAt(0) || user.email?.charAt(0)}
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-800 leading-tight flex items-center gap-1">
            {user.name}
            <span title="Settings synced" className="text-green-500 text-xs">
              ✓
            </span>
          </span>
          <span className="text-xs text-gray-500">{user.email}</span>
        </div>
        <button
          onClick={handleSignOut}
          className="ml-2 px-2 py-1 text-xs font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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
      className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm rounded shadow-sm transition-colors"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
      Sign in with Google
    </button>
  );
}
