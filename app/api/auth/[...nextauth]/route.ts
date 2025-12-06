// app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth";
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
      name: "Login mit E-Mail",
      credentials: {
        email: { label: "E-Mail-Adresse", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          // Basisdaten fehlen
          throw new Error(
            "Bitte gib deine E-Mail-Adresse und dein Passwort ein."
          );
        }

        // Nutzer in der Datenbank suchen
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        // Aus Datenschutzgründen immer dieselbe Fehlermeldung
        if (!user) {
          throw new Error("E-Mail-Adresse oder Passwort ist nicht korrekt.");
        }

        // Passwort prüfen (bcrypt)
        const isValid = await compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error("E-Mail-Adresse oder Passwort ist nicht korrekt.");
        }

        // Login erfolgreich → minimale User-Daten zurückgeben
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
      // Beim Login kommt "user" einmalig
      if (user) {
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      // Infos aus dem Token in die Session schieben
      if (session.user && token) {
        session.user.name = (token.name as string) ?? null;
        session.user.email = (token.email as string) ?? null;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
