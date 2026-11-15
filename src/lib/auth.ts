import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";

export type SocialProvider = "discord" | "google";

type OAuthCredentials = { clientId: string; clientSecret: string };

function readCredentials(prefix: string): OAuthCredentials | null {
  const clientId = process.env[`${prefix}_CLIENT_ID`];
  const clientSecret = process.env[`${prefix}_CLIENT_SECRET`];
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

function configuredSocialProviders(): Partial<Record<SocialProvider, OAuthCredentials>> {
  const providers: Partial<Record<SocialProvider, OAuthCredentials>> = {};
  const discord = readCredentials("DISCORD");
  const google = readCredentials("GOOGLE");
  if (discord) providers.discord = discord;
  if (google) providers.google = google;
  return providers;
}

export function enabledSocialProviders(): SocialProvider[] {
  return Object.keys(configuredSocialProviders()) as SocialProvider[];
}

async function createAuth() {
  return betterAuth({
    database: drizzleAdapter(await getDb(), { provider: "pg", schema }),
    emailAndPassword: { enabled: true },
    socialProviders: configuredSocialProviders(),
    plugins: [nextCookies()],
  });
}

let authPromise: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  authPromise ??= createAuth();
  return authPromise;
}
