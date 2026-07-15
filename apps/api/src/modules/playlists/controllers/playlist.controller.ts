import type { NextFunction, Request, Response } from 'express'
import { paginationSchema } from '@universal-healthcare/shared'
import { AppError } from '../../../shared/errors/app-error.js'
import { envelope } from '../../../shared/pagination/format.js'
import { playlistService } from '../services/playlist.service.js'
import {
  toPlaylistResponse,
} from '../types/playlist.types.js'
import {
  createPlaylistSchema,
  playlistIdParamSchema,
  updatePlaylistSchema,
} from '../validators/playlist.validators.js'

function userIdOrThrow(req: Request): string {
  const id = (req as Request & { userId?: string }).userId
  if (!id) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required')
  }
  return id
}

export const playlistController = {
  // ── Public: get a public playlist by ID ──────────────────────────────
  async getPublic(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = playlistIdParamSchema.parse(req.params)
      const playlist = await playlistService.getPublicById(id)
      res.status(200).json({ data: toPlaylistResponse(playlist) })
    } catch (err) {
      next(err)
    }
  },

  // ── Authenticated: list my playlists ─────────────────────────────────
  async listMine(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const me = userIdOrThrow(req)
      const { page, pageSize } = paginationSchema.parse(req.query)
      const { items, total } = await playlistService.listByUserId(
        me,
        page,
        pageSize
      )
      res.status(200).json({
        data: items.map(toPlaylistResponse),
        pagination: envelope(page, pageSize, total),
      })
    } catch (err) {
      next(err)
    }
  },

  // ── Authenticated: get one of my playlists ───────────────────────────
  async getMine(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const me = userIdOrThrow(req)
      const { id } = playlistIdParamSchema.parse(req.params)
      const playlist = await playlistService.getById(id, me)
      res.status(200).json({ data: toPlaylistResponse(playlist) })
    } catch (err) {
      next(err)
    }
  },

  // ── Authenticated: create a playlist ─────────────────────────────────
  async create(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const me = userIdOrThrow(req)
      const body = createPlaylistSchema.parse(req.body)
      const playlist = await playlistService.create({
        userId: me,
        title: body.title,
        isPublic: body.isPublic,
        tracks: body.tracks,
      })
      res.status(201).json({ data: toPlaylistResponse(playlist) })
    } catch (err) {
      next(err)
    }
  },

  // ── Authenticated: update a playlist ─────────────────────────────────
  async update(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const me = userIdOrThrow(req)
      const { id } = playlistIdParamSchema.parse(req.params)
      const body = updatePlaylistSchema.parse(req.body)
      const playlist = await playlistService.update(id, me, body)
      res.status(200).json({ data: toPlaylistResponse(playlist) })
    } catch (err) {
      next(err)
    }
  },

  // ── Authenticated: delete a playlist ─────────────────────────────────
  async delete(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const me = userIdOrThrow(req)
      const { id } = playlistIdParamSchema.parse(req.params)
      await playlistService.delete(id, me)
      // 204 No Content — matches follow.controller.ts:41 / comment.controller.ts:101.
      res.status(204).end()
    } catch (err) {
      next(err)
    }
  },
}
