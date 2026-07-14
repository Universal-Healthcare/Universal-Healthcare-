import { Router } from 'express'
import { requireAuth } from '../../../shared/middleware/auth.middleware.js'
import { notificationController } from '../controllers/notification.controller.js'

// Mounted at `/api/notifications` in app.ts. ALL routes are auth-required —
// notifications are user-private data, so the entire router is gated
// immediately. No public endpoint exists in this module.
export const notificationRouter: Router = Router()
notificationRouter.use(requireAuth)

notificationRouter.get('/', (req, res, next) => {
  notificationController.listMine(req, res, next).catch(next)
})

notificationRouter.patch('/:id/read', (req, res, next) => {
  notificationController.markRead(req, res, next).catch(next)
})

notificationRouter.post('/read-all', (req, res, next) => {
  notificationController.markAllRead(req, res, next).catch(next)
})

notificationRouter.delete('/:id', (req, res, next) => {
  notificationController.delete(req, res, next).catch(next)
})
