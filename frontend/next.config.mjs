/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
  async headers() {
    return [
      // Immutable static assets (Next.js content-hashed chunks): cache hard.
      // The hash in the filename guarantees a different URL on rebuild, so
      // long-term caching is safe and prevents re-downloading the bundle.
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Public static files (favicons, manifest, og images): cached but
      // revalidated daily so we can swap them without bumping a hash.
      {
        source: '/:path*\\.(png|jpg|jpeg|webp|svg|ico|woff|woff2)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, must-revalidate' },
        ],
      },
      // Manifest can change occasionally; revalidate on each load.
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      // HTML pages and everything else: never serve a stale HTML after a deploy.
      // The HTML references content-hashed chunks; if the HTML is stale, the
      // chunks 404 and the user sees ChunkLoadError. Forcing must-revalidate
      // ensures the browser/CDN re-asks the origin on every request.
      // s-maxage=0 + stale-while-revalidate=60 lets the edge serve a possibly
      // recent HTML for 60s while it revalidates in the background.
      {
        source: '/((?!_next/static|_next/image).*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=0, must-revalidate, stale-while-revalidate=60' },
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
  // Force new build ID per build so Vercel CDN always sees a fresh deployment
  // (the immutable hash in chunk filenames is what does the heavy lifting).
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
};

export default nextConfig;
