import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../errors/app-error.js'
import { logger } from '../logger/logger.js'
import { captureException } from '../observability/sentry.js'

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res
      .status(err.statusCode)
      .json({ error: { code: err.code, message: err.message } })
    return
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.issues.map((issue) => issue.message).join(', '),
      },
    })
    return
  }

  // Unhandled error — log + capture to Sentry with request context, then
  // respond with a generic 500. We never echo the raw error message back
  // to the client (it may contain internal details).
  const errMessage = err instanceof Error ? err.message : String(err)
  const errStack = err instanceof Error ? err.stack : undefined
  logger.error('Unhandled error', { error: errMessage, stack: errStack })
  captureException(err, {
    requestId: (req as Request & { requestId?: string }).requestId,
    method: req.method,
    path: req.path,
  })
  res.status(500).json({
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' },
  })
}
