import request from "supertest"
import { beforeEach, describe, expect, it } from "vitest"
import { createApp } from "../../../app.js"
import { buildEmailService } from "../../../shared/email/index.js"

const app = createApp()

beforeEach(() => {
  buildEmailService()
})

describe("email verification flow", () => {
  it("POST /api/auth/resend-verification always returns 202", async () => {
    const res = await request(app)
      .post("/api/auth/resend-verification")
      .send({ email: "does-not-exist@example.com" })
    expect(res.status).toBe(202)
  })

  it("POST /api/auth/verify-email with a bogus token returns 400", async () => {
    const res = await request(app)
      .post("/api/auth/verify-email")
      .send({ token: "definitely-not-real" })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe("INVALID_VERIFICATION_TOKEN")
  })
})
