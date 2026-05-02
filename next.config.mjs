/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Custom server handles port and routing; build static assets only.
  // Note: Next.js 16 uses Turbopack by default. Because we keep a custom
  // webpack rule below, the build script passes `--webpack` to opt out
  // of Turbopack for `next build`.
  webpack: (config) => {
    // Allow .mjs extension imports
    config.module.rules.push({
      test: /\.m?js/,
      resolve: { fullySpecified: false },
    });
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
    ],
  },
};

export default nextConfig;
