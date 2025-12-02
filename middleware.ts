// middleware.ts
export { default } from "next-auth/middleware";

// Aqui defines quais rotas precisam de login
export const config = {
  matcher: [
    "/dashboard",
    "/account/:path*",
    "/admin/:path*",
    // se quiseres, depois podemos adicionar mais, ex:
    // "/checkout",
  ],
};
