import type { OAuthProvider } from "./auth-providers";

export type AppEventMap = {
  "user.joined_platform": {
    userId: number;
    email: string;
    name: string | null;
    oauthProvider: OAuthProvider;
  };
};
