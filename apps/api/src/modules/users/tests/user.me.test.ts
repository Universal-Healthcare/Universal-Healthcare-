import request from "supertest"
import { beforeEach, describe, expect, it } from "vitest"
import { createApp } from "../../../app.js"
import { prisma } from "../../../shared/database/prisma.js"

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

describe("GET /api/users/me", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get("/api/users/me")
    expect(res.status).toBe(401)
  })

  it("returns userId with null profiles when none exist", async () => {
    const { token, userId } = await registerAndLogin("getme@test.com")
    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.user.id).toBe(userId)
    expect(res.body.user.creatorProfile).toBeNull()
    expect(res.body.user.fanProfile).toBeNull()
  })

  it("includes fan profile when one exists", async () => {
    const { token, userId } = await registerAndLogin("getme-fan@test.com")

    await prisma.fanProfile.create({
      data: { userId, displayName: "Fan User" },
    })

    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.user.fanProfile).not.toBeNull()
    expect(res.body.user.fanProfile.displayName).toBe("Fan User")
    expect(res.body.user.fanProfile.genrePrefs).toEqual([])
  })
})

describe("PATCH /api/users/me", () => {
  it("rejects unauthenticated requests", async () => {
    const res = await request(app).patch("/api/users/me").send({ displayName: "X" })
    expect(res.status).toBe(401)
  })

  it("returns 400 for an invalid payload (displayName too short)", async () => {
    const { token } = await registerAndLogin("invalid-patch@test.com")
    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ displayName: "X" })

    expect(res.status).toBe(400)
  })

  it("succeeds with no profiles (no-op)", async () => {
    const { token } = await registerAndLogin("noprofile-patch@test.com")
    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ displayName: "Ghost User" })

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it("updates fan genrePrefs when the user has a fan profile", async () => {
    const { token, userId } = await registerAndLogin("genreprefs-patch@test.com")

    await prisma.fanProfile.create({
      data: { userId, displayName: "Genre Fan" },
    })

    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ genrePrefs: ["jazz", "indie"] })

    expect(res.status).toBe(200)

    const meRes = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${token}`)

    expect(meRes.body.user.fanProfile.genrePrefs).toEqual(["jazz", "indie"])
  })

  it("updates creator fields when the user has a creator profile", async () => {
    const { token, userId } = await registerAndLogin("creator-patch@test.com")

    await prisma.creatorProfile.create({
      data: { userId, displayName: "Original", slug: "original" },
    })

    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ displayName: "Updated Name", bio: "New bio", genre: "jazz" })

    expect(res.status).toBe(200)

    const meRes = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${token}`)

    expect(meRes.body.user.creatorProfile.displayName).toBe("Updated Name")
    expect(meRes.body.user.creatorProfile.bio).toBe("New bio")
  })
})
