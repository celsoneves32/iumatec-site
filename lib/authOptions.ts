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
        const email = credentials?.email?.toString().trim().toLowerCase();
        const password = credentials?.password?.toString();

        if (!email || !password) {
          throw new Error("Bitte gib deine E-Mail-Adresse und dein Passwort ein.");
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          throw new Error("E-Mail-Adresse oder Passwort ist nicht korrekt.");
        }

        const isValid = await compare(password, user.password);

        if (!isValid) {
          throw new Error("E-Mail-Adresse oder Passwort ist nicht korrekt.");
        }

        // IMPORTANTE: devolver "id" para entrar no JWT
        return {
          id: user.id,
          name: user.name ?? "",
          email: user.email,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // no login o "user" existe; guardar o id
      if (user) {
        token.id = (user as any).id;
        token.name = (user as any).name ?? token.name;
        token.email = (user as any).email ?? token.email;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        // anexar o id ao session.user para o server usar
        (session.user as any).id = (token as any).id ?? null;
        session.user.name = (token.name as string) ?? null;
        session.user.email = (token.email as string) ?? null;
      }
      return session;
    },
  },
};
