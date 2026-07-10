import type { Server } from 'node:http'
import { logger } from '../logger/logger.js'
import { prisma } from '../database/prisma.js'
import { flushSentry } from '../observability/sentry.js'

export type ShutdownDeps = {
  server: Server
  drainTimeoutMs?: number
  forceExitMs?: number
  signals?: NodeJS.EventEmitter
}

const DEFAULT_DRAIN_TIMEOUT_MS = 10_000
const DEFAULT_FORCE_EXIT_MS = 25_000

let installed = false
let shuttingDown = false

export function installGracefulShutdown(deps: ShutdownDeps): void {
  if (installed) return
  installed = true

  const signals = deps.signals ?? process
  const drainTimeoutMs = deps.drainTimeoutMs ?? DEFAULT_DRAIN_TIMEOUT_MS
  const forceExitMs = deps.forceExitMs ?? DEFAULT_FORCE_EXIT_MS

  const shutdown = async (signal: NodeJS.Signals | 'manual'): Promise<void> => {
    if (shuttingDown) return
    shuttingDown = true
    logger.info('shutdown_started', { signal })

    const forceExitTimer = setTimeout(() => {
      logger.error('shutdown_force_exit', { signal })
      process.exit(1)
    }, forceExitMs)
    forceExitTimer.unref()

    try {
      await new Promise<void>((resolve, reject) => {
        deps.server.close((err) => (err ? reject(err) : resolve()))
        setTimeout(() => resolve(), drainTimeoutMs).unref()
      })
      logger.info('shutdown_server_closed')

      await prisma.$disconnect()
      logger.info('shutdown_db_disconnected')

      // Flush in-flight Sentry events before the process exits. This is a
      // no-op when Sentry isn't initialized.
      await flushSentry(2_000)

      clearTimeout(forceExitTimer)
      logger.info('shutdown_complete', { signal })
      process.exit(0)
    } catch (err) {
      logger.error('shutdown_error', { err: (err as Error).message })
      process.exit(1)
    }
  }

  signals.on('SIGTERM', () => void shutdown('SIGTERM'))
  signals.on('SIGINT', () => void shutdown('SIGINT'))
}

export function shutdownForTest(): void {
  installed = false
  shuttingDown = false
}

export const __test = { shutdown: () => shuttingDown }
