import type { NextAuthConfig } from "next-auth";

// Edge-compatible config — no Prisma calls, used by middleware
export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.userId = user.id;
      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        (session as unknown as Record<string, unknown>).farmId = token.farmId;
        (session as unknown as Record<string, unknown>).farmRole = token.farmRole;
        (session as unknown as Record<string, unknown>).farmSlug = token.farmSlug;
      }
      return session;
    },
  },
};
