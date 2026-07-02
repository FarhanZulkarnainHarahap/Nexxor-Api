import { completeOAuthLogin } from "./authjs.service";
import { AuthJsAccount, AuthJsProfile } from "../types/authjs";
import type { AuthConfig } from "@auth/core" with { "resolution-mode": "import" };

export function isOAuthProviderConfigured(provider: string) {
  if (provider === "google") {
    return Boolean(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
    );
  }
  if (provider === "tiktok") {
    return Boolean(
      process.env.TIKTOK_CLIENT_ID && process.env.TIKTOK_CLIENT_SECRET,
    );
  }
  return false;
}

export async function getAuthJsConfig(): Promise<AuthConfig> {
  const [{ default: Google }, { default: TikTok }] = await Promise.all([
    import("@auth/express/providers/google"),
    import("@auth/express/providers/tiktok"),
  ]);
  const providers = [];

  if (isOAuthProviderConfigured("google")) {
    providers.push(
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
    );
  }

  if (isOAuthProviderConfigured("tiktok")) {
    providers.push(
      TikTok({
        clientId: process.env.TIKTOK_CLIENT_ID!,
        clientSecret: process.env.TIKTOK_CLIENT_SECRET!,
      }),
    );
  }

  const config: AuthConfig = {
    secret: process.env.AUTH_SECRET,
    trustHost: process.env.AUTH_TRUST_HOST === "true",
    basePath: "/api/auth",
    providers,
    pages: {
      error: "/api/auth/oauth-error",
    },
    callbacks: {
      async signIn({ account, profile }) {
        if (!account || !profile) return false;
        return completeOAuthLogin(
          account as AuthJsAccount,
          profile as unknown as AuthJsProfile,
        );
      },
      async redirect({ url }: { url: string }) {
        const frontendOrigin = new URL(
          (process.env.FRONTEND_URL ?? "http://localhost:3000").split(",")[0],
        ).origin;
        if (new URL(url).origin === frontendOrigin) return url;
        return (process.env.BACKEND_URL ?? "http://localhost:5000").replace(
          /\/+$/,
          "",
        );
      },
    },
  };
  return config;
}
