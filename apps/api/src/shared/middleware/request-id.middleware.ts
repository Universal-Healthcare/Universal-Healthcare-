import { randomUUID } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'

const HEADER = 'x-request-id'
const DEFAULT_MAX_LENGTH = 128
const SAFE = /^[A-Za-z0-9._-]+$/

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id: string
    }
  }
}

export function requestId(): (
  req: Request,
  res: Response,
  next: NextFunction
) => void {
  return (req, res, next) => {
    const incoming = req.header(HEADER)?.trim()
    const candidate =
      incoming && incoming.length <= DEFAULT_MAX_LENGTH && SAFE.test(incoming)
        ? incoming
        : randomUUID()
    req.id = candidate
    res.setHeader(HEADER, candidate)
    next()
  }
}
