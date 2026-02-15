// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // HTTPS hardening
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },

          // Basic security headers
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

          // Permissions Policy (ajusta se precisares de camera/mic etc)
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },

          // CSP mínimo (não quebra fácil). Se tiveres scripts externos novos, ajusta.
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; " +
              "img-src 'self' data: https:; " +
              "style-src 'self' 'unsafe-inline'; " +
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://connect.facebook.net; " +
              "connect-src 'self' https:; " +
              "frame-ancestors 'self';",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
