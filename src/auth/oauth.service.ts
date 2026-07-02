import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import {
  OAuthProvider,
  Prisma,
} from "../../prisma/generated/prisma/client";
import { prisma } from "../config/prisma";
import {
  AuthJsAccount,
  AuthJsProfile,
  NexxoraOAuthUser,
  OAuthIdentity,
} from "../types/authjs";

function providerFromAuthJs(provider: string) {
  if (provider === "google") return OAuthProvider.GOOGLE;
  if (provider === "tiktok") return OAuthProvider.TIKTOK;
  throw new Error("Unsupported OAuth provider");
}

function jsonProfile(profile: AuthJsProfile) {
  return JSON.parse(JSON.stringify(profile)) as Prisma.InputJsonValue;
}

export function buildOAuthIdentity(
  account: AuthJsAccount,
  profile: AuthJsProfile,
): OAuthIdentity {
  const provider = providerFromAuthJs(account.provider);
  const providerAccountId =
    account.providerAccountId || profile.sub || profile.id || profile.open_id;

  if (!providerAccountId) {
    throw new Error("OAuth provider did not return an account identifier");
  }

  const isTikTok = provider === OAuthProvider.TIKTOK;
  const email =
    profile.email?.trim().toLowerCase() ||
    `tiktok_${providerAccountId.replace(/[^a-zA-Z0-9_-]/g, "_")}@oauth.local`;
  const name =
    profile.name?.trim() ||
    profile.display_name?.trim() ||
    (isTikTok ? "TikTok User" : email.split("@")[0]);

  return {
    provider,
    providerAccountId,
    name,
    email,
    avatarUrl:
      profile.picture ?? profile.image ?? profile.avatar_url ?? null,
    emailVerified:
      !isTikTok && profile.email_verified !== false ? new Date() : null,
    profileCompleted: !isTikTok && Boolean(profile.email),
    rawProfile: profile,
  };
}

export async function createOrLinkOAuthUser(
  identity: OAuthIdentity,
): Promise<NexxoraOAuthUser> {
  const existingAccount = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider: identity.provider,
        providerAccountId: identity.providerAccountId,
      },
    },
    include: { user: true },
  });

  if (existingAccount) {
    const user = await prisma.user.update({
      where: { id: existingAccount.userId },
      data: {
        avatarUrl: identity.avatarUrl ?? existingAccount.user.avatarUrl,
        avatar: identity.avatarUrl ?? existingAccount.user.avatar,
      },
    });

    await prisma.oAuthAccount.update({
      where: { id: existingAccount.id },
      data: { rawProfile: jsonProfile(identity.rawProfile) },
    });

    return user;
  }

  const userByEmail = await prisma.user.findUnique({
    where: { email: identity.email },
  });
  const password = await bcrypt.hash(randomBytes(32).toString("hex"), 12);

  const user = await prisma.$transaction(async (tx) => {
    const linkedUser =
      userByEmail ??
      (await tx.user.create({
        data: {
          name: identity.name,
          email: identity.email,
          password,
          avatar: identity.avatarUrl,
          avatarUrl: identity.avatarUrl,
          profileCompleted: identity.profileCompleted,
          emailVerified: identity.emailVerified,
          emailVerifiedAt: identity.emailVerified,
          cart: { create: {} },
        },
      }));

    if (userByEmail) {
      await tx.user.update({
        where: { id: linkedUser.id },
        data: {
          avatarUrl: linkedUser.avatarUrl ?? identity.avatarUrl,
          avatar: linkedUser.avatar ?? identity.avatarUrl,
          emailVerified: linkedUser.emailVerified ?? identity.emailVerified,
          emailVerifiedAt:
            linkedUser.emailVerifiedAt ?? identity.emailVerified,
        },
      });
    }

    await tx.oAuthAccount.create({
      data: {
        userId: linkedUser.id,
        provider: identity.provider,
        providerAccountId: identity.providerAccountId,
        rawProfile: jsonProfile(identity.rawProfile),
        // Provider tokens are intentionally not persisted until a server-side
        // provider API use case requires them.
      },
    });

    return tx.user.findUniqueOrThrow({ where: { id: linkedUser.id } });
  });

  return user;
}
