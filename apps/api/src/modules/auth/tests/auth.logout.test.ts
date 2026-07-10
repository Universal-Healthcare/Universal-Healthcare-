import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../../../app.js'
import { buildEmailService } from '../../../shared/email/index.js'

const app = createApp()

beforeEach(() => {
  buildEmailService()
})

describe('POST /api/auth/logout', () => {
  it('revokes the refresh token and returns 204', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      email: 'logout@example.com',
      password: 'password1',
      role: 'fan',
      displayName: 'Logout Tester',
    })
    const refreshToken = reg.body.tokens.refreshToken

    await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken })
      .expect(204)

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken })

    expect(res.status).toBe(401)
  })

  it('succeeds with no body (idempotent)', async () => {
    const res = await request(app).post('/api/auth/logout').send({})
    expect(res.status).toBe(204)
  })
})
