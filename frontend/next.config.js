/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://master-backend-79jx.onrender.com';

const securityHeaders = [
  { key: 'X-Frame-Options',        value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',     value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://wizelife.ai https://www.googletagmanager.com https://www.google-analytics.com https://static.cloudflareinsights.com https://www.clarity.ms https://*.clarity.ms https://apis.google.com https://*.firebaseapp.com https://www.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://wizelife.ai https://*.vercel.app https://mastermove.vercel.app https://api.groq.com https://generativelanguage.googleapis.com https://openrouter.ai https://*.clarity.ms https://www.clarity.ms https://*.googleapis.com https://*.firebaseio.com https://master-backend-79jx.onrender.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig = {
  // Tree-shake heavier 3rd-party imports more aggressively. recharts in
  // particular pulls a full set of named exports — this lets Next.js drop
  // the unused chart types (Pie, Radar, Scatter, etc. we never render).
  // lucide-react also benefits since we use 20-ish icons out of ~1000.
  experimental: {
    optimizePackageImports: ['recharts', 'lucide-react', 'react-markdown'],
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
