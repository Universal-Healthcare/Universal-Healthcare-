import { afterAll, beforeEach } from "vitest"
import { prisma } from "../src/shared/database/prisma.js"

beforeEach(async () => {
  await prisma.user.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})
