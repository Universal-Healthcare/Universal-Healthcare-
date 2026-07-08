import request from "supertest"
import { describe, expect, it } from "vitest"
import { createApp } from "../../../app.js"

const app = createApp()

describe("POST /api/auth/register", () => {
  it("registers a new user", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "fan@example.com", password: "password1" })

    expect(response.status).toBe(201)
    expect(response.body.user.email).toBe("fan@example.com")
    expect(typeof response.body.token).toBe("string")
    expect(response.body.user.passwordHash).toBeUndefined()
  })

  it("rejects duplicate emails", async () => {
    await request(app)
      .post("/api/auth/register")
      .send({ email: "dup@example.com", password: "password1" })

    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "dup@example.com", password: "password1" })

    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe("EMAIL_ALREADY_REGISTERED")
  })

  it("rejects invalid input", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "not-an-email", password: "short" })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe("VALIDATION_ERROR")
  })
})
