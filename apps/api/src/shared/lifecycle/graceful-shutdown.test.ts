import { EventEmitter } from 'node:events'
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../database/prisma.js', () => ({
  prisma: {
    $disconnect: vi.fn().mockResolvedValue(undefined),
  },
}))

import { prisma } from '../database/prisma.js'
import {
  installGracefulShutdown,
  shutdownForTest,
} from './graceful-shutdown.js'

class FakeServer {
  private listeners: Array<(err?: Error) => void> = []
  close(cb: (err?: Error) => void) {
    this.listeners.push(cb)
  }
  finishClose() {
    for (const cb of this.listeners) cb()
  }
  hasPending() {
    return this.listeners.length > 0
  }
}

describe('graceful-shutdown', () => {
  beforeEach(() => {
    shutdownForTest()
    vi.clearAllMocks()
  })

  it('traps SIGTERM, closes the server and disconnects prisma', async () => {
    const signals = new EventEmitter()
    const server = new FakeServer()
    installGracefulShutdown({
      server: server as never,
      signals,
      drainTimeoutMs: 100,
      forceExitMs: 5000,
    })

    let exitCode: number | undefined
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
      exitCode = typeof code === 'number' ? code : 0
      return undefined as never
    })

    signals.emit('SIGTERM', 'SIGTERM')
    expect(server.hasPending()).toBe(true)
    server.finishClose()

    await new Promise((r) => setImmediate(r))
    expect(prisma.$disconnect).toHaveBeenCalledTimes(1)
    expect(exitCode).toBe(0)

    exitSpy.mockRestore()
  })

  it('is idempotent — installing twice only registers one handler chain', () => {
    const signals = new EventEmitter()
    const server = new FakeServer()
    installGracefulShutdown({ server: server as never, signals })
    installGracefulShutdown({ server: server as never, signals })
    expect(signals.listenerCount('SIGTERM')).toBe(1)
  })
})
