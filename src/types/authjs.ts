import { OAuthProvider, Role } from "../../prisma/generated/prisma/client";

export type AuthJsProfile = {
  sub?: string | null;
  id?: string | null;
  open_id?: string | null;
  name?: string | null;
  display_name?: string | null;
  email?: string | null;
  picture?: string | null;
  image?: string | null;
  avatar_url?: string | null;
  email_verified?: boolean;
  [key: string]: unknown;
};

export type AuthJsAccount = {
  provider: string;
  providerAccountId: string;
};

export type OAuthIdentity = {
  provider: OAuthProvider;
  providerAccountId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  emailVerified: Date | null;
  profileCompleted: boolean;
  rawProfile: AuthJsProfile;
};

export type NexxoraOAuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  profileCompleted: boolean;
};
