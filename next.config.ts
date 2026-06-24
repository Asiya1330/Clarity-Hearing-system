import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Emit a self-contained server bundle at .next/standalone for a minimal
  // production Docker image. Inert for `next dev`/`next start` and Vercel.
  output: "standalone",
};

export default withSentryConfig(nextConfig, {
  // Org/project/authToken are read from SENTRY_ORG / SENTRY_PROJECT /
  // SENTRY_AUTH_TOKEN env vars in CI. No hardcoded values here.
  silent: true,

  // Upload source maps for dependencies as well as application code,
  // so stack traces in Sentry are readable. Applies to both builds.
  widenClientFileUpload: true,

  // Remove Sentry SDK debug-logging code from the production bundle.
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
  },

  // Webpack-only options (no-op with Turbopack; used in CI webpack builds).
  webpack: {
    automaticVercelMonitors: false,
  },
});
