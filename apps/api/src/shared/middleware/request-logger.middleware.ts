import type { NextFunction, Request, Response } from 'express'
import { logger } from '../logger/logger.js'

const REDACTED_HEADERS = new Set(['authorization', 'cookie', 'x-api-key'])

function safeHeaders(headers: Request['headers']): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue
    out[key] = REDACTED_HEADERS.has(key.toLowerCase())
      ? '[redacted]'
      : String(value)
  }
  return out
}

export function requestLogger(): (
  req: Request,
  res: Response,
  next: NextFunction
) => void {
  return (req, res, next) => {
    const start = process.hrtime.bigint()
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6
      const userId = (req as Request & { userId?: string }).userId
      logger.info('http_request', {
        requestId: req.id,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
        userId,
        ip: req.ip,
        userAgent: req.header('user-agent') ?? null,
      })
    })
    res.on('close', () => {
      if (res.writableEnded) return
      logger.warn('http_request_aborted', {
        requestId: req.id,
        method: req.method,
        path: req.originalUrl,
      })
    })
    next()
  }
}

export { safeHeaders }
