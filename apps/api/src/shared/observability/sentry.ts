import * as Sentry from "@sentry/node"
import { env } from "../config/env.js"
import { logger } from "../logger/logger.js"

let initialized = false

/**
 * Initialize the Sentry SDK from environment variables.
 *
 * Safe to call multiple times — only the first call has any effect.
 * If SENTRY_DSN is empty the SDK is left uninitialized and every other
 * helper in this file becomes a no-op. This means dev / test / local
 * environments work out of the box without a Sentry DSN.
 */
export function initSentry(): void {
  if (initialized) return
  initialized = true

  if (!env.SENTRY_DSN) {
    logger.info("sentry_disabled", { reason: "SENTRY_DSN not set" })
    return
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV,
    release: env.SENTRY_RELEASE || undefined,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
    sendDefaultPii: false,
  })

  logger.info("sentry_initialized", {
    environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV,
    release: env.SENTRY_RELEASE,
  })
}

export function captureException(
  err: unknown,
  context?: Record<string, unknown>
): void {
  if (!initialized || !env.SENTRY_DSN) return
  Sentry.captureException(err, { extra: context })
}

export function setUserContext(
  user: { id: string; email: string } | null
): void {
  if (!initialized || !env.SENTRY_DSN) return
  Sentry.setUser(user ? { id: user.id, email: user.email } : null)
}

export function addBreadcrumb(breadcrumb: {
  category?: string
  message: string
  level?: Sentry.SeverityLevel
  data?: Record<string, unknown>
}): void {
  if (!initialized || !env.SENTRY_DSN) return
  Sentry.addBreadcrumb(breadcrumb)
}

/**
 * Flush pending Sentry events. Called during graceful shutdown so we
 * don't drop in-flight exceptions on SIGTERM.
 */
export async function flushSentry(timeoutMs = 2_000): Promise<void> {
  if (!initialized || !env.SENTRY_DSN) return
  await Sentry.flush(timeoutMs)
}
