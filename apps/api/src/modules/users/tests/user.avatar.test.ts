import request from "supertest"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createApp } from "../../../app.js"
import { prisma } from "../../../shared/database/prisma.js"

vi.mock("../../../shared/storage/s3.js", () => ({
  createAvatarUploadUrl: vi.fn().mockResolvedValue("https://s3.example.com/presigned-url"),
}))

const app = createApp()

async function registerAndLogin(email: string) {
  await request(app)
    .post("/api/auth/register")
    .send({ email, password: "Password1!" })

  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: "Password1!" })

  return { token: res.body.token as string, userId: res.body.user.id as string }
}

beforeEach(async () => {
  await prisma.fanProfile.deleteMany()
  await prisma.creatorProfile.deleteMany()
  await prisma.user.deleteMany()
})

describe("POST /api/users/me/avatar-upload-url", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await request(app)
      .post("/api/users/me/avatar-upload-url")
      .send({ contentType: "image/jpeg" })

    expect(res.status).toBe(401)
  })

  it("rejects an unsupported content type", async () => {
    const { token } = await registerAndLogin("avatar-invalid@test.com")

    const res = await request(app)
      .post("/api/users/me/avatar-upload-url")
      .set("Authorization", `Bearer ${token}`)
      .send({ contentType: "image/gif" })

    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe("INVALID_CONTENT_TYPE")
  })

  it("rejects a request with no contentType", async () => {
    const { token } = await registerAndLogin("avatar-missing@test.com")

    const res = await request(app)
      .post("/api/users/me/avatar-upload-url")
      .set("Authorization", `Bearer ${token}`)
      .send({})

    expect(res.status).toBe(400)
  })

  it("returns a presigned uploadUrl and the final avatarUrl for jpeg", async () => {
    const { token, userId } = await registerAndLogin("avatar-jpeg@test.com")

    const res = await request(app)
      .post("/api/users/me/avatar-upload-url")
      .set("Authorization", `Bearer ${token}`)
      .send({ contentType: "image/jpeg" })

    expect(res.status).toBe(200)
    expect(typeof res.body.uploadUrl).toBe("string")
    expect(res.body.avatarUrl).toContain(`avatars/${userId}.jpeg`)
  })

  it("returns a presigned uploadUrl and the final avatarUrl for png", async () => {
    const { token, userId } = await registerAndLogin("avatar-png@test.com")

    const res = await request(app)
      .post("/api/users/me/avatar-upload-url")
      .set("Authorization", `Bearer ${token}`)
      .send({ contentType: "image/png" })

    expect(res.status).toBe(200)
    expect(res.body.avatarUrl).toContain(`avatars/${userId}.png`)
  })
})
