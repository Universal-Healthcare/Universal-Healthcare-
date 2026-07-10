import { prisma } from '../../../shared/database/prisma.js'
import type { CreateUserInput, User } from '../types/user.types.js'

export const userRepository = {
  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } })
  },

  findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } })
  },

  findByIdWithProfiles(
    id: string
  ): Promise<(User & { creatorProfile: unknown; fanProfile: unknown }) | null> {
    return prisma.user.findUnique({
      where: { id },
      include: { creatorProfile: true, fanProfile: true },
    }) as Promise<
      (User & { creatorProfile: unknown; fanProfile: unknown }) | null
    >
  },

  create(input: CreateUserInput): Promise<User> {
    return prisma.user.create({ data: input })
  },

  async markEmailVerified(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { emailVerified: true },
    })
  },
}
