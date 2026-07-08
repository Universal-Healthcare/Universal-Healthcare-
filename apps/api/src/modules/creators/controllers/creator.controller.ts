import type { NextFunction, Request, Response } from "express"
import { paginationSchema } from "@universal-healthcare/shared"
import { creatorService } from "../services/creator.service.js"
import { toCreatorResponse } from "../types/creator.types.js"
import { AppError } from "../../../shared/errors/app-error.js"

export const creatorController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, pageSize } = paginationSchema.parse(req.query)
      const searchRaw = req.query.search
      const search = typeof searchRaw === "string" && searchRaw.trim() ? searchRaw.trim() : undefined

      const { data, total } = await creatorService.list({ page, pageSize, search })
      res.status(200).json({
        data: data.map(toCreatorResponse),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
      })
    } catch (err) {
      next(err)
    }
  },

  async getBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { slug } = req.params
      const profile = await creatorService.findBySlug(slug!)

      if (!profile) {
        throw new AppError(404, "CREATOR_NOT_FOUND", "Creator profile not found")
      }

      res.status(200).json(toCreatorResponse(profile))
    } catch (error) {
      next(error)
    }
  },
}
