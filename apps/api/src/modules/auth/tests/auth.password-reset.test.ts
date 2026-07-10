import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../../../app.js'
import { buildEmailService } from '../../../shared/email/index.js'

const app = createApp()

beforeEach(() => {
  buildEmailService()
})

describe('password reset flow', () => {
  it('POST /api/auth/forgot-password always returns 202', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'does-not-exist@example.com' })
    expect(res.status).toBe(202)
  })

  it('POST /api/auth/reset-password rejects an invalid token', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'definitely-not-real', newPassword: 'newpassword1' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_RESET_TOKEN')
  })

  it('POST /api/auth/reset-password rejects a weak new password', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'any', newPassword: 'short' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
})
