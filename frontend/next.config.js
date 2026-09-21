/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: "standalone",
  experimental: {
    typedRoutes: false,
  },
  transpilePackages: ["mapbox-gl"],
};

module.exports = nextConfig;
