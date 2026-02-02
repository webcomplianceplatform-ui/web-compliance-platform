import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { logAccessEvent } from "@/lib/access-events";
import crypto from "crypto";
import { isSuperadminEmail } from "@/lib/superadmin";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    // Session timeout: default 12h (override via SESSION_MAX_AGE_SECONDS)
    maxAge: Number(process.env.SESSION_MAX_AGE_SECONDS || 43200),
    // refresh token window (JWT strategy uses this to update cookie)
    updateAge: Number(process.env.SESSION_UPDATE_AGE_SECONDS || 3600),
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const email = credentials?.email?.toString().toLowerCase().trim();
        const password = credentials?.password?.toString() ?? "";
        if (!email || !password) return null;

        const ip =
          (req?.headers?.["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ||
          (req?.headers?.["x-real-ip"] as string | undefined) ||
          "unknown";

        const userAgent =
          (req?.headers?.["user-agent"] as string | undefined) ||
          (req?.headers?.["User-Agent"] as string | undefined) ||
          "";

        const rlIp = rateLimit({ key: `login:ip:${ip}`, limit: 30, windowMs: 60_000 });
        if (rlIp.ok === false) return null;
        const rlEmail = rateLimit({ key: `login:email:${email}`, limit: 10, windowMs: 60_000 });
        if (rlEmail.ok === false) return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            sessionVersion: true,
            mustChangePassword: true,
            mfaEnabled: true,
          },
        });
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        // Best-effort access logging (success).
        void logAccessEvent({
          kind: "LOGIN_SUCCESS",
          userId: user.id,
          ip,
          userAgent,
          metaJson: { provider: "credentials" },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          // used for server-side session invalidation
          sessionVersion: user.sessionVersion ?? 0,
          mustChangePassword: !!user.mustChangePassword,
          // pass through request context so jwt() can create a session record
          __ip: ip,
          __ua: userAgent,
          __isSuperadmin: isSuperadminEmail(user.email),
          __mfaEnabled: !!user.mfaEnabled,
        };
      },
    }),
  ],
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = (user as any).id;
        token.sv = (user as any).sessionVersion ?? 0;
        token.mcp = (user as any).mustChangePassword ?? false;

        // Create a stable server-side session record (per-session revoke).
        // Only runs on sign-in.
        const sid = crypto.randomUUID();
        token.sid = sid;
        token.lsa = Date.now();
        const ip = (user as any).__ip as string | undefined;
        const ua = (user as any).__ua as string | undefined;
        const isSa = !!(user as any).__isSuperadmin;
        const mfaEnabled = !!(user as any).__mfaEnabled;

        const ipHash = ip ? sha256(ip) : null;
        const deviceHash = ua ? sha256(ua) : null;

        // Device approval (MVP): superadmin sessions coming from an unapproved device
        // must complete step-up MFA before accessing the control plane.
        // Device fingerprint is currently UA-hash (can be upgraded later).
        let requiresStepUp = false;
        if (isSa && mfaEnabled && deviceHash) {
          try {
            const td = await prisma.trustedDevice.findUnique({
              where: { userId_deviceHash: { userId: String((user as any).id), deviceHash } },
              select: { approvedAt: true, revokedAt: true },
            });

            const approved = !!td?.approvedAt && !td?.revokedAt;
            if (!approved) {
              requiresStepUp = true;
              void logAccessEvent({
                kind: "RISK_UNAPPROVED_DEVICE",
                userId: String((user as any).id),
                ip: ip ?? null,
                userAgent: ua ?? null,
                metaJson: { scope: "GLOBAL", reason: "device_not_approved" },
              });
            } else {
              // best-effort: keep lastSeen for trusted device fresh
              void prisma.trustedDevice.update({
                where: { userId_deviceHash: { userId: String((user as any).id), deviceHash } },
                data: { lastSeenAt: new Date() },
              });
            }
          } catch {
            // best-effort
          }
        }
        try {
          await prisma.userSession.create({
            data: {
              id: sid,
              userId: String((user as any).id),
              ip: ip ?? null,
              userAgent: ua ?? null,
              ipHash,
              deviceHash,
              requiresStepUp,
              sessionVersionAtIssue: (user as any).sessionVersion ?? 0,
              metaJson: { strategy: "nextauth_jwt" },
            },
          });
        } catch {
          // best-effort
        }
      }

      // Best-effort: touch lastSeenAt and detect revoked sessions.
      if (token?.sid && token?.uid) {
        try {
          const sess = await prisma.userSession.findUnique({
            where: { id: String(token.sid) },
            select: { revokedAt: true, userId: true, lastSeenAt: true },
          });
          if (!sess || sess.userId !== String(token.uid) || !!sess.revokedAt) {
            (token as any).invalid = true;
            return token;
          }

          const now = Date.now();
          const last = typeof (token as any).lsa === "number" ? (token as any).lsa : 0;
          if (now - last > 5 * 60 * 1000) {
            await prisma.userSession.update({
              where: { id: String(token.sid) },
              data: { lastSeenAt: new Date(now) },
            });
            (token as any).lsa = now;
          }
        } catch {
          // best-effort
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.uid;
        (session.user as any).sessionVersion = (token as any).sv ?? 0;
        (session.user as any).mustChangePassword = (token as any).mcp ?? false;
        (session.user as any).sessionId = (token as any).sid ?? null;
        (session as any).invalid = (token as any).invalid ?? false;
      }
      return session;
    },
  },
};
