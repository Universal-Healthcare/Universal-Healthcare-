import { Router } from 'express'
import { requireAuth } from '../../../shared/middleware/auth.middleware.js'
import { fanController } from '../controllers/fan.controller.js'
import {
  createFanProfileSchema,
  setGenrePrefsSchema,
  updateFanProfileSchema,
} from '../validators/fan.validators.js'

function validate<T>(schema: { parse: (v: unknown) => T }) {
  return (
    req: { body: unknown },
    _res: unknown,
    next: (e?: unknown) => void
  ) => {
    req.body = schema.parse(req.body)
    next()
  }
}

export const fansRouter: Router = Router()

fansRouter.use(requireAuth)

fansRouter.get('/me', (req, res, next) => {
  fanController.getMe(req, res).catch(next)
})

fansRouter.put('/me', validate(createFanProfileSchema), (req, res, next) => {
  fanController.upsertMe(req, res).catch(next)
})

fansRouter.patch('/me', validate(updateFanProfileSchema), (req, res, next) => {
  fanController.patchMe(req, res).catch(next)
})

fansRouter.put(
  '/me/genre-prefs',
  validate(setGenrePrefsSchema),
  (req, res, next) => {
    fanController.setGenrePrefs(req, res).catch(next)
  }
)
