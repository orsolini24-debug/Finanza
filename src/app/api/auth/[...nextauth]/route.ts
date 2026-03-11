export const dynamic = 'force-dynamic'

import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        login: { label: "Email o Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.login || !credentials?.password) return null;

        const login = credentials.login.trim().toLowerCase();

        // Cerca per email o username
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: login },
              { username: login },
            ],
          },
        });

        if (!user) return null;

        // Utente con password bcrypt
        if (user.password) {
          const valid = await bcrypt.compare(credentials.password, user.password);
          if (!valid) return null;
        } else {
          // Backward compat: utenti vecchi senza password usano ADMIN_PASSWORD
          const adminPassword = process.env.ADMIN_PASSWORD || "password";
          if (credentials.password !== adminPassword) return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          isOnboarded: user.isOnboarded,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }: any) {
      if (user) {
        token.id = user.id;
        token.isOnboarded = (user as any).isOnboarded;
      }
      // Handle session update (e.g., after completing onboarding)
      if (trigger === "update" && session?.isOnboarded !== undefined) {
        token.isOnboarded = session.isOnboarded;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).isOnboarded = token.isOnboarded;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/signin",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
