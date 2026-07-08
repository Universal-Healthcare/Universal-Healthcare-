import request from "supertest"
import { beforeEach, describe, expect, it } from "vitest"
import { createApp } from "../../../app.js"
import { buildEmailService } from "../../../shared/email/index.js"

const app = createApp()

beforeEach(() => {
  buildEmailService()
})

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await request(app)
      .post("/api/auth/register")
      .send({
        email: "login@example.com",
        password: "password1",
        role: "fan",
        displayName: "Login Tester",
      })
  })

  it("logs in with valid credentials and returns tokens + profile", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@example.com", password: "password1" })

    expect(response.status).toBe(200)
    expect(response.body.user.email).toBe("login@example.com")
    expect(response.body.user.role).toBe("fan")
    expect(typeof response.body.tokens.accessToken).toBe("string")
    expect(typeof response.body.tokens.refreshToken).toBe("string")
    expect(response.body.profile).toBeTruthy()
    expect(response.body.profile.displayName).toBe("Login Tester")
  })

  it("rejects an incorrect password", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@example.com", password: "wrongpassword1" })

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe("INVALID_CREDENTIALS")
  })

  it("rejects a non-existent account", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "missing@example.com", password: "password1" })

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe("INVALID_CREDENTIALS")
  })
})
