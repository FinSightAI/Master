import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tax Master AI — Global Tax Advisor',
    short_name: 'Tax Master',
    description: 'AI-powered international tax advisor for optimal tax planning.',
    start_url: '/advisor',
    display: 'standalone',
    background_color: '#0f1117',
    theme_color: '#10b981',
    orientation: 'portrait-primary',
    icons: [
      {
        src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="32" fill="%230f1117"/><text x="96" y="130" font-size="110" text-anchor="middle">🧾</text></svg>',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="80" fill="%230f1117"/><text x="256" y="360" font-size="300" text-anchor="middle">🧾</text></svg>',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
