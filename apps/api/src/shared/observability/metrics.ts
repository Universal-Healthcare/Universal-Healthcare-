import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client'

export const metricsRegistry = new Registry()

collectDefaultMetrics({
  register: metricsRegistry,
  prefix: 'uhc_',
})

export const httpRequestsTotal = new Counter({
  name: 'uhc_http_requests_total',
  help: 'Total HTTP requests handled, labelled by method/route/status.',
  labelNames: ['method', 'route', 'status'],
  registers: [metricsRegistry],
})

export const httpRequestDurationSeconds = new Histogram({
  name: 'uhc_http_request_duration_seconds',
  help: 'HTTP request duration in seconds, labelled by method/route/status.',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [metricsRegistry],
})

export const httpRequestsInFlight = new Gauge({
  name: 'uhc_http_requests_in_flight',
  help: 'Number of HTTP requests currently being handled.',
  registers: [metricsRegistry],
})

export const dbQueryDurationSeconds = new Histogram({
  name: 'uhc_db_query_duration_seconds',
  help: 'Database query duration in seconds, labelled by operation.',
  labelNames: ['operation', 'result'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2.5, 5],
  registers: [metricsRegistry],
})

export async function metricsSnapshot(): Promise<{
  contentType: string
  body: string
}> {
  return {
    contentType: metricsRegistry.contentType,
    body: await metricsRegistry.metrics(),
  }
}
