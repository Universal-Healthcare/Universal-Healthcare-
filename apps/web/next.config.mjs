import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@universal-healthcare/shared'],
  webpack: (config) => {
    // @universal-healthcare/shared uses NodeNext-style ".js" specifiers that point at
    // ".ts" source files; teach webpack to resolve those for the workspace
    // package since it isn't pre-compiled to dist.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
    }
    return config
  },
}

// withSentryConfig adds source map upload (only if SENTRY_AUTH_TOKEN is set)
// and wraps the config with the Sentry build plugin. When NEXT_PUBLIC_SENTRY_DSN
// is empty the Sentry config files are no-ops, so the build succeeds without
// a Sentry project.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Disable telemetry + upload when the DSN/token are missing so dev/CI builds
  // stay quiet. These default to true in the SDK.
  disable: !process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.SENTRY_AUTH_TOKEN,
  hideSourceMaps: true,
  widenClientFileUpload: true,
  transpileClientSDK: true,
  // Keep source maps out of the production bundle; upload separately if needed.
  dryRun: !process.env.SENTRY_AUTH_TOKEN,
})
