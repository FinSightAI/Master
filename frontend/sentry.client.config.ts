// Sentry — browser SDK
// Loaded by @sentry/nextjs on every client page.
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV || 'development',
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
