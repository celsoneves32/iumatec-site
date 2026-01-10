// lib/authOptions.ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "E-Mail-Adresse", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          throw new Error("Bitte gib deine E-Mail-Adresse und dein Passwort ein.");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error("E-Mail-Adresse oder Passwort ist nicht korrekt.");
        }

        const isValid = await compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error("E-Mail-Adresse oder Passwort ist nicht korrekt.");
        }

        return {
          id: user.id, // IMPORTANT: isto tem de existir
          name: user.name ?? "",
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Ao fazer login, o "user" vem do authorize()
      if (user) {
        token.id = (user as any).id; // IMPORTANT
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        // IMPORTANT: expor o id no session.user
        (session.user as any).id = (token as any).id ?? null;
        session.user.name = (token.name as string) ?? null;
        session.user.email = (token.email as string) ?? null;
      }
      return session;
    },
  },
};
