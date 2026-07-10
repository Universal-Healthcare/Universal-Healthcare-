import type { NextFunction, Request, Response } from 'express'
import {
  httpRequestDurationSeconds,
  httpRequestsInFlight,
  httpRequestsTotal,
} from './metrics.js'

function normaliseRoute(req: Request): string {
  if (req.route?.path) {
    return `${req.baseUrl ?? ''}${req.route.path}`
  }
  return req.path.replace(/\/[0-9a-f-]{8,}/gi, '/:id')
}

export function metricsMiddleware(): (
  req: Request,
  res: Response,
  next: NextFunction
) => void {
  return (req, res, next) => {
    httpRequestsInFlight.inc()
    const start = process.hrtime.bigint()

    res.on('finish', () => {
      const route = normaliseRoute(req)
      const labels = {
        method: req.method,
        route,
        status: String(res.statusCode),
      }
      const seconds = Number(process.hrtime.bigint() - start) / 1e9
      httpRequestsTotal.inc(labels)
      httpRequestDurationSeconds.observe(labels, seconds)
      httpRequestsInFlight.dec()
    })

    next()
  }
}
