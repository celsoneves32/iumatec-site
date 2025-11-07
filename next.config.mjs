import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "lucide-react": path.resolve(process.cwd(), "stubs/lucide-react.tsx"),
    };
    return config;
  },
};

export default nextConfig;
