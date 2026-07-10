import express from 'express'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { env } from '../../../shared/config/env.js'
import { errorHandler } from '../../../shared/middleware/error-handler.js'
import { requireAuth } from '../../../shared/middleware/auth.middleware.js'

function buildTestApp() {
  const app = express()

  app.get('/protected', requireAuth, (req, res) => {
    res.status(200).json({ userId: req.userId })
  })

  app.use(errorHandler)

  return app
}

describe('requireAuth middleware', () => {
  it('allows requests with a valid token', async () => {
    const app = buildTestApp()
    const token = jwt.sign({ sub: 'user-123' }, env.JWT_SECRET)

    const response = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`)

    expect(response.status).toBe(200)
    expect(response.body.userId).toBe('user-123')
  })

  it('rejects requests without a token', async () => {
    const app = buildTestApp()

    const response = await request(app).get('/protected')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('UNAUTHORIZED')
  })

  it('rejects requests with an invalid token', async () => {
    const app = buildTestApp()

    const response = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer not-a-real-token')

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('UNAUTHORIZED')
  })
})
