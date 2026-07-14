import { Router } from 'express'
import { requireAuth } from '../../../shared/middleware/auth.middleware.js'
import { followController } from '../controllers/follow.controller.js'

// Mounted at `/api/follows` in app.ts. Routes here are RELATIVE to that
// mount point — `/me/following/:followeeId` resolves to
// `/api/follows/me/following/:followeeId` from the outside.
export const followRouter: Router = Router()

// ─────────────────────────────────────────────────────────────────────────────
//  Public endpoints — must precede the requireAuth gate so anonymous callers
//  can browse a target's follower / following lists.
// ─────────────────────────────────────────────────────────────────────────────

followRouter.get('/users/:userId/following', (req, res, next) => {
  followController.listUserFollowing(req, res, next).catch(next)
})

followRouter.get('/users/:userId/followers', (req, res, next) => {
  followController.listUserFollowers(req, res, next).catch(next)
})

// ─────────────────────────────────────────────────────────────────────────────
//  Authenticated endpoints.
// ─────────────────────────────────────────────────────────────────────────────

followRouter.use(requireAuth)

followRouter.post('/me/following/:followeeId', (req, res, next) => {
  followController.follow(req, res, next).catch(next)
})

followRouter.delete('/me/following/:followeeId', (req, res, next) => {
  followController.unfollow(req, res, next).catch(next)
})

followRouter.get('/me/following', (req, res, next) => {
  followController.listMyFollowing(req, res, next).catch(next)
})

followRouter.get('/me/followers', (req, res, next) => {
  followController.listMyFollowers(req, res, next).catch(next)
})
