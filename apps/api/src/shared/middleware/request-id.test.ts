import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { requestId } from './request-id.middleware.js'

function buildApp() {
  const app = express()
  app.use(requestId())
  app.get('/echo', (req, res) => {
    res.json({ id: req.id })
  })
  return app
}

describe('requestId middleware', () => {
  it('generates a uuid-shaped id when no header is provided', async () => {
    const app = buildApp()
    const res = await request(app).get('/echo')
    expect(res.status).toBe(200)
    expect(res.body.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
    expect(res.headers['x-request-id']).toBe(res.body.id)
  })

  it('trusts a safe incoming x-request-id header', async () => {
    const app = buildApp()
    const incoming = 'abc-123-DEF'
    const res = await request(app).get('/echo').set('x-request-id', incoming)
    expect(res.body.id).toBe(incoming)
    expect(res.headers['x-request-id']).toBe(incoming)
  })

  it('rejects unsafe incoming ids and generates a fresh one', async () => {
    const app = buildApp()
    const res = await request(app)
      .get('/echo')
      .set('x-request-id', 'bad value with spaces & symbols')
    expect(res.body.id).not.toBe('bad value with spaces & symbols')
    expect(res.body.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
  })
})
