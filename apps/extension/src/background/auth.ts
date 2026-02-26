export interface UserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export const AuthManager = {
  async signIn(interactive = true): Promise<UserInfo | null> {
    try {
      const token = await this.getAuthToken(interactive);
      if (!token) return null;

      return await this.fetchUserInfo(token);
    } catch (error) {
      console.error("AuthManager - signIn error:", error);
      return null;
    }
  },

  async signOut(): Promise<boolean> {
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
      return true;
    } catch (error) {
      console.error("AuthManager - signOut error:", error);
      return false;
    }
  },

  async getAuthStatus(): Promise<UserInfo | null> {
    try {
      // Try to get token silently to check if already logged in
      const token = await this.getAuthToken(false);
      if (!token) return null;

      return await this.fetchUserInfo(token);
    } catch (error) {
      // If we fail silently, it might mean we are logged out
      return null;
    }
  },

  async getAuthToken(interactive: boolean): Promise<string> {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive }, (result: any) => {
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
};
