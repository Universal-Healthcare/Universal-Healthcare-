import { createApp } from './app.js'
import { env } from './shared/config/env.js'
import { buildEmailService } from './shared/email/index.js'
import { installGracefulShutdown } from './shared/lifecycle/graceful-shutdown.js'
import { logger } from './shared/logger/logger.js'
import { initSentry } from './shared/observability/sentry.js'

initSentry()
buildEmailService()

const app = createApp()

const server = app.listen(env.PORT, () => {
  logger.info('api_listening', { port: env.PORT, env: env.NODE_ENV })
})

installGracefulShutdown({ server })

process.on('uncaughtException', (err) => {
  logger.error('uncaught_exception', { err: err.message, stack: err.stack })
})

process.on('unhandledRejection', (reason) => {
  logger.error('unhandled_rejection', { reason: String(reason) })
})
