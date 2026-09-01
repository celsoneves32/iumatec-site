/** @type {import('next').NextConfig} */
const nextConfig = {
  staticPageGenerationTimeout: 300,

  experimental: {
    outputFileTracingIncludes: {
      "/*": [
        "./integrations/alltron/out/iumatec-storefront-clean-1.json",
        "./integrations/alltron/out/iumatec-storefront-clean-2.json",
      ],
    },
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.icecat.biz",
        pathname: "/**",
      },
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

