import type { NextFunction, Request, Response } from 'express'
import { searchQuerySchema } from '@universal-healthcare/shared'
import { searchService } from '../services/search.service.js'

export const searchController = {
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Zod parse → 400 on missing `q`, invalid `types`, or any
      // out-of-range page / pageSize / limit (handled by the centralized
      // error-handler middleware).
      const parsed = searchQuerySchema.parse(req.query)
      const types = parsed.types ?? []
      const limit = parsed.limit ?? parsed.pageSize
      const result = await searchService.search({
        q: parsed.q,
        page: parsed.page,
        pageSize: parsed.pageSize,
        limit,
        types,
      })
      res.status(200).json(result)
    } catch (err) {
      next(err)
    }
  },
}
