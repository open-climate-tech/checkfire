/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Custom server handles port and routing; build static assets only.
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
  eslint: {
    // Lint only the standard Next.js source dirs; ignore legacy paths.
    dirs: ['pages', 'src'],
  },
};

export default nextConfig;
