import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit'
import type { RequestHandler } from 'express'
import { env } from '../config/env.js'
import { logger } from '../logger/logger.js'

const TEST_SKIP = () => (_req: unknown, _res: unknown, next: () => void) =>
  next()

export function buildRateLimiter(): RequestHandler {
  if (env.NODE_ENV === 'test') {
    return TEST_SKIP() as unknown as RequestHandler
  }

  const limiter: RateLimitRequestHandler = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    keyGenerator: (req) => req.ip ?? 'unknown',
    handler: (req, res) => {
      logger.warn('rate_limit_exceeded', {
        requestId: (req as { id?: string }).id,
        ip: req.ip,
        path: req.originalUrl,
      })
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later.',
        },
      })
    },
  })

  return limiter as unknown as RequestHandler
}
