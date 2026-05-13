/** @type {import('next').NextConfig} */
// Build-time metadata para DeployBadge.
// Vercel inyecta VERCEL_GIT_COMMIT_SHA y VERCEL_ENV automáticamente al build.
const BUILD_TIME = new Date().toISOString();
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_GIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || '',
    NEXT_PUBLIC_BUILD_TIME: BUILD_TIME,
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV || (process.env.NODE_ENV === 'production' ? 'production' : 'development'),
  },
  async headers() {
    return [
      {
        source: '/((?!_next/static|_next/image|favicon.ico).*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
      },
    ];
  },
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
};

export default nextConfig;
