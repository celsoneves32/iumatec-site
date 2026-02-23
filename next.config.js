/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Shopify CDN (produtos)
      { protocol: "https", hostname: "cdn.shopify.com" },

      // Se tiveres imagens noutras origens, adiciona aqui
      // { protocol: "https", hostname: "your-domain.com" },
    ],
  },
};

module.exports = nextConfig;
