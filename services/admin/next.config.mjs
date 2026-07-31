/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  transpilePackages: ['@openeventhub/shared'],
  eslint: {
    // Root monorepo ESLint (`npm run lint`) is the source of truth.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
