import { signOutFromFirebase } from "./firebase";

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
}

const AUTH_USER_STORAGE_KEY = "auth_user";
const AUTH_SESSION_ACTIVE_STORAGE_KEY = "auth_session_active";
type AuthTokenResult = string | { token?: string };

function isUserInfo(value: unknown): value is UserInfo {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as UserInfo).id === "string" &&
    typeof (value as UserInfo).email === "string" &&
    typeof (value as UserInfo).name === "string" &&
    typeof (value as UserInfo).picture === "string"
  );
}

export const AuthManager = {
  async signIn(interactive = true): Promise<UserInfo | null> {
    try {
      const token = await this.getAuthToken(interactive);
      if (!token) return null;

      const user = await this.fetchUserInfo(token);
      await this.setSessionActive(true);
      await this.setCachedUser(user);
      return user;
    } catch (error) {
      await this.setSessionActive(false);
      await this.clearCachedUser();
      console.error("AuthManager - signIn error:", error);
      return null;
    }
  },

  async signOut(): Promise<boolean> {
    let hadCleanupError = false;

    try {
      // Local extension auth state must be cleared even if Chrome token cleanup is imperfect.
      await this.setSessionActive(false);
      await this.clearCachedUser();

      try {
        await signOutFromFirebase();
      } catch (error) {
        hadCleanupError = true;
        console.warn("AuthManager - Firebase signOut cleanup warning:", error);
      }

      try {
        const token = await this.getAuthToken(false);
        if (token) {
          await new Promise<void>((resolve, reject) => {
            chrome.identity.removeCachedAuthToken({ token }, () => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve();
              }
            });
          });
        }
      } catch (error) {
        hadCleanupError = true;
        console.warn("AuthManager - removeCachedAuthToken cleanup warning:", error);
      }

      if (typeof chrome.identity.clearAllCachedAuthTokens === "function") {
        try {
          await new Promise<void>((resolve, reject) => {
            chrome.identity.clearAllCachedAuthTokens(() => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve();
              }
            });
          });
        } catch (error) {
          hadCleanupError = true;
          console.warn("AuthManager - clearAllCachedAuthTokens cleanup warning:", error);
        }
      }

      if (hadCleanupError) {
        console.warn(
          "AuthManager - signOut completed with token cleanup warnings, but local auth state was cleared.",
        );
      }

      return true;
    } catch (error) {
      console.error("AuthManager - signOut error:", error);
      return false;
    }
  },

  async getAuthStatus(): Promise<UserInfo | null> {
    const isSessionActive = await this.getSessionActive();
    if (!isSessionActive) {
      return null;
    }

    try {
      const token = await this.getAuthToken(false);
      if (!token) {
        await this.setSessionActive(false);
        await this.clearCachedUser();
        return null;
      }

      const cachedUser = await this.getCachedUser();
      if (cachedUser) {
        return cachedUser;
      }

      const user = await this.fetchUserInfo(token);
      await this.setCachedUser(user);
      return user;
    } catch (error) {
      await this.setSessionActive(false);
      await this.clearCachedUser();
      console.error("AuthManager - getAuthStatus error:", error);
      return null;
    }
  },

  async getAuthToken(interactive: boolean): Promise<string> {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive }, (result: AuthTokenResult) => {
        const tokenString = typeof result === "string" ? result : result?.token;
        if (chrome.runtime.lastError || !tokenString) {
          reject(chrome.runtime.lastError || new Error("No token returned"));
        } else {
          resolve(tokenString);
        }
      });
    });
  },

  async fetchUserInfo(token: string): Promise<UserInfo> {
    const response = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch user info: ${response.status}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.picture,
    };
  },

  async getCachedUser(): Promise<UserInfo | null> {
    const data = await chrome.storage.local.get(AUTH_USER_STORAGE_KEY);
    const cachedUser = data[AUTH_USER_STORAGE_KEY];
    return isUserInfo(cachedUser) ? cachedUser : null;
  },

  async getSessionActive(): Promise<boolean> {
    const data = await chrome.storage.local.get(AUTH_SESSION_ACTIVE_STORAGE_KEY);
    return data[AUTH_SESSION_ACTIVE_STORAGE_KEY] === true;
  },

  async setCachedUser(user: UserInfo): Promise<void> {
    await chrome.storage.local.set({ [AUTH_USER_STORAGE_KEY]: user });
  },

  async setSessionActive(isActive: boolean): Promise<void> {
    await chrome.storage.local.set({
      [AUTH_SESSION_ACTIVE_STORAGE_KEY]: isActive,
    });
  },

  async clearCachedUser(): Promise<void> {
    await chrome.storage.local.remove(AUTH_USER_STORAGE_KEY);
  },
};
