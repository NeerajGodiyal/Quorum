import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { db } from "@oc/db";

const secret = process.env.BETTER_AUTH_SECRET;
const isBuild = process.env.NEXT_PHASE === "phase-production-build";

if (!secret && !isBuild && process.env.NODE_ENV === "production") {
  throw new Error("BETTER_AUTH_SECRET is required in production. Generate one with: openssl rand -base64 32");
}

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export const auth = betterAuth({
  secret: secret ?? "overclock-dev-secret-local-only",
  baseURL,
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  plugins: [admin()],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  trustedOrigins: [baseURL, "https://*.trycloudflare.com"],
});

export type Session = typeof auth.$Infer.Session;
