/** @type {import('next').NextConfig} */

// const withTM = require('next-transpile-modules')(['@babel/preset-react']);
//   '@fullcalendar/common',
//   '@fullcalendar/daygrid',
//   '@fullcalendar/interaction',
//   '@fullcalendar/react',

const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: '4mb' } },
  async headers() {
    return [{
      source: '/:path*', headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
      ]
    }];
  },
  basePath: process.env.NEXT_PUBLIC_BASE_PATH,
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'i.ibb.co' },
      { protocol: 'https', hostname: 'scontent.fotp8-1.fna.fbcdn.net' },
    ],
    // Set NEXT_PUBLIC_BASE_PATH env var to enable image optimization
    unoptimized: true,
  },
};

module.exports = nextConfig;
