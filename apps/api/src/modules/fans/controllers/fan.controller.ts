import type { Request, Response } from 'express'
import { AppError } from '../../../shared/errors/app-error.js'
import { fanService } from '../services/fan.service.js'
import { toFanResponse } from '../types/fan.types.js'
import type {
  CreateFanProfileBody,
  SetGenrePrefsBody,
  UpdateFanProfileBody,
} from '../validators/fan.validators.js'

function userId(req: Request): string {
  const id = (req as Request & { userId?: string }).userId
  if (!id) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required')
  }
  return id
}

export const fanController = {
  async getMe(req: Request, res: Response): Promise<void> {
    const id = userId(req)
    const profile = await fanService.findByUserId(id)
    if (!profile) {
      throw new AppError(404, 'FAN_PROFILE_NOT_FOUND', 'Fan profile not found')
    }
    res.status(200).json({ data: toFanResponse(profile) })
  },

  async upsertMe(req: Request, res: Response): Promise<void> {
    const id = userId(req)
    const body = req.body as CreateFanProfileBody
    const existing = await fanService.findByUserId(id)
    const profile = existing
      ? await fanService.updateFanProfile(existing.id, body, id)
      : await fanService.createFanProfile({
          userId: id,
          displayName: body.displayName,
        })
    res.status(existing ? 200 : 201).json({ data: toFanResponse(profile) })
  },

  async patchMe(req: Request, res: Response): Promise<void> {
    const id = userId(req)
    const body = req.body as UpdateFanProfileBody
    const existing = await fanService.findByUserId(id)
    if (!existing) {
      throw new AppError(404, 'FAN_PROFILE_NOT_FOUND', 'Fan profile not found')
    }
    const profile = await fanService.updateFanProfile(existing.id, body, id)
    res.status(200).json({ data: toFanResponse(profile) })
  },

  async setGenrePrefs(req: Request, res: Response): Promise<void> {
    const id = userId(req)
    const body = req.body as SetGenrePrefsBody
    const existing = await fanService.findByUserId(id)
    if (!existing) {
      throw new AppError(404, 'FAN_PROFILE_NOT_FOUND', 'Fan profile not found')
    }
    const profile = await fanService.updateGenrePrefs(
      existing.id,
      body.genrePrefs,
      id
    )
    res.status(200).json({ data: toFanResponse(profile) })
  },
}
