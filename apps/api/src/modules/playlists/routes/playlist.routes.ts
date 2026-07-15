import { Router } from 'express'
import { requireAuth } from '../../../shared/middleware/auth.middleware.js'
import { playlistController } from '../controllers/playlist.controller.js'

// Mounted at `/api/playlists` in app.ts. Routes here are RELATIVE to that
// mount point — `/api/playlists/public/:id` → `GET /api/playlists/public/:id`.
export const playlistsRouter: Router = Router()

// ─────────────────────────────────────────────────────────────────────────────
//  Public endpoint — anonymous callers can view public playlists.
//  Must precede the requireAuth gate.
// ─────────────────────────────────────────────────────────────────────────────

playlistsRouter.get('/public/:id', (req, res, next) => {
  playlistController.getPublic(req, res, next).catch(next)
})

// ─────────────────────────────────────────────────────────────────────────────
//  Authenticated endpoints.
// ─────────────────────────────────────────────────────────────────────────────

playlistsRouter.use(requireAuth)

playlistsRouter.get('/', (req, res, next) => {
  playlistController.listMine(req, res, next).catch(next)
})

playlistsRouter.get('/:id', (req, res, next) => {
  playlistController.getMine(req, res, next).catch(next)
})

playlistsRouter.post('/', (req, res, next) => {
  playlistController.create(req, res, next).catch(next)
})

playlistsRouter.put('/:id', (req, res, next) => {
  playlistController.update(req, res, next).catch(next)
})

playlistsRouter.delete('/:id', (req, res, next) => {
  playlistController.delete(req, res, next).catch(next)
})
