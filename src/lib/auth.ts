import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
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

        const rlIp = rateLimit({ key: `login:ip:${ip}`, limit: 30, windowMs: 60_000 });
        if (rlIp.ok === false) return null;
        const rlEmail = rateLimit({ key: `login:email:${email}`, limit: 10, windowMs: 60_000 });
        if (rlEmail.ok === false) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, email: user.email, name: user.name ?? undefined };
      },
    }),
  ],
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.uid = (user as any).id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as any).id = token.uid;
      return session;
    },
  },
};
