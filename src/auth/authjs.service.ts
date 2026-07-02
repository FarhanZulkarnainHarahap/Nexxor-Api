import { signToken } from "../utils/jwt";
import { AuthJsAccount, AuthJsProfile } from "../types/authjs";
import { buildOAuthIdentity, createOrLinkOAuthUser } from "./oauth.service";

function frontendCallbackUrl() {
  const frontendUrl = (process.env.FRONTEND_URL ?? "http://localhost:3000")
    .split(",")[0]
    .trim()
    .replace(/\/+$/, "");
  return `${frontendUrl}/auth/callback`;
}

export async function completeOAuthLogin(
  account: AuthJsAccount,
  profile: AuthJsProfile,
) {
  const identity = buildOAuthIdentity(account, profile);
  const user = await createOrLinkOAuthUser(identity);
  const token = signToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });
  const params = new URLSearchParams({
    token,
    profileCompleted: String(user.profileCompleted),
  });

  // A fragment is not included in HTTP requests, keeping the Nexxora JWT out
  // of callback request logs and away from the OAuth provider.
  return `${frontendCallbackUrl()}#${params.toString()}`;
}

export function oauthErrorUrl(error: unknown) {
  const message =
    error instanceof Error ? error.message : "OAuth authentication failed";
  const params = new URLSearchParams({ error: message });
  return `${frontendCallbackUrl()}?${params.toString()}`;
}
