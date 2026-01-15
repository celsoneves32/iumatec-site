callbacks: {
  async jwt({ token, user }) {
    // quando faz login, o "user" existe
    if (user) {
      token.id = (user as any).id;
      token.name = user.name;
      token.email = user.email;
    }
    return token;
  },
  async session({ session, token }) {
    if (session.user && token) {
      (session.user as any).id = token.id as string;
      session.user.name = (token.name as string) ?? null;
      session.user.email = (token.email as string) ?? null;
    }
    return session;
  },
},
