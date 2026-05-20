import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.userId = user.id;

      // Look up farm context — runs only in Node.js (not Edge)
      if (token.userId) {
        const farmUser = await db.farmUser.findFirst({
          where: { userId: token.userId as string },
          include: { farm: true },
          orderBy: { createdAt: "asc" },
        });
        if (farmUser) {
          token.farmId = farmUser.farmId;
          token.farmRole = farmUser.role;
          token.farmSlug = farmUser.farm.slug;
        } else {
          token.farmId = undefined;
          token.farmRole = undefined;
          token.farmSlug = undefined;
        }
      }

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
});
