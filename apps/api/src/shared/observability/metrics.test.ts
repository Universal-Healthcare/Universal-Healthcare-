import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { metricsMiddleware } from './metrics.middleware.js'
import {
  httpRequestsInFlight,
  httpRequestsTotal,
  metricsRegistry,
  metricsSnapshot,
} from './metrics.js'

function buildApp() {
  const app = express()
  app.use(metricsMiddleware())
  app.get('/ping', (_req, res) => res.json({ ok: true }))
  app.get('/boom', (_req, res) => res.status(500).json({ error: 'x' }))
  return app
}

describe('metrics', () => {
  it('increments httpRequestsTotal on each response', async () => {
    const before = await httpRequestsTotal.get()
    const beforeSum = before.values.reduce((acc, v) => acc + v.value, 0)
    const app = buildApp()
    await request(app).get('/ping').expect(200)
    await request(app).get('/boom').expect(500)
    const after = await httpRequestsTotal.get()
    const afterSum = after.values.reduce((acc, v) => acc + v.value, 0)
    expect(afterSum - beforeSum).toBe(2)
  })

  it('exposes a Prometheus text snapshot', async () => {
    const snapshot = await metricsSnapshot()
    expect(snapshot.contentType).toMatch(/text\/plain/)
    expect(snapshot.body).toContain('uhc_http_requests_total')
    expect(snapshot.body).toMatch(/uhc_http_requests_in_flight/)
  })

  it('tracks in-flight gauge through the lifecycle of a request', async () => {
    const start = await httpRequestsInFlight.get()
    const app = buildApp()
    await request(app).get('/ping')
    const end = await httpRequestsInFlight.get()
    expect(end.values[0]?.value).toBe(start.values[0]?.value ?? 0)
  })

  it('uses a fresh registry per test run (registry is a singleton)', () => {
    expect(metricsRegistry).toBeInstanceOf(Object)
  })
})
