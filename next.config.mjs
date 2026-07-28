/** @type {import('next').NextConfig} */
const nextConfig = {
  staticPageGenerationTimeout: 300,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.alltron.ch",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.competec.ch",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "media.digitec.ch",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "static.digitecgalaxus.ch",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
