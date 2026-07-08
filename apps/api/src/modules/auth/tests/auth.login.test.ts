import request from "supertest"
import { beforeEach, describe, expect, it } from "vitest"
import { createApp } from "../../../app.js"

const app = createApp()

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "login@example.com", password: "password1" })
  })

  it("logs in with valid credentials", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@example.com", password: "password1" })

    expect(response.status).toBe(200)
    expect(response.body.user.email).toBe("login@example.com")
    expect(typeof response.body.token).toBe("string")
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
