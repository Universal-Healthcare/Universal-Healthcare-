import { afterAll, beforeEach } from "vitest"
import { prisma } from "../src/shared/database/prisma.js"

beforeEach(async () => {
  // Order matters: child tables first, then the User cascade clears the rest.
  await prisma.passwordResetToken.deleteMany()
  await prisma.emailVerificationToken.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.fanProfile.deleteMany()
  await prisma.creatorProfile.deleteMany()
  await prisma.user.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})
