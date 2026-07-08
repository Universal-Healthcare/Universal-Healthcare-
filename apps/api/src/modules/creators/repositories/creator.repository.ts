import { prisma } from "../../../shared/database/prisma.js"
import type {
  CreateCreatorInput,
  CreatorProfile,
  UpdateCreatorInput,
} from "../types/creator.types.js"

export const creatorRepository = {
  findById(id: string): Promise<CreatorProfile | null> {
    return prisma.creatorProfile.findUnique({ where: { id } })
  },

  findBySlug(slug: string): Promise<CreatorProfile | null> {
    return prisma.creatorProfile.findUnique({ where: { slug } })
  },

  findByUserId(userId: string): Promise<CreatorProfile | null> {
    return prisma.creatorProfile.findUnique({ where: { userId } })
  },

  listMany(opts: {
    skip: number
    take: number
    search?: string
  }): Promise<CreatorProfile[]> {
    const where = opts.search
      ? {
          OR: [
            { displayName: { contains: opts.search } },
            { slug: { contains: opts.search } },
            { bio: { contains: opts.search } },
          ],
        }
      : {}
    return prisma.creatorProfile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: opts.skip,
      take: opts.take,
    })
  },

  count(opts: { search?: string } = {}): Promise<number> {
    const where = opts.search
      ? {
          OR: [
            { displayName: { contains: opts.search } },
            { slug: { contains: opts.search } },
            { bio: { contains: opts.search } },
          ],
        }
      : {}
    return prisma.creatorProfile.count({ where })
  },

  create(input: CreateCreatorInput & { slug: string }): Promise<CreatorProfile> {
    return prisma.creatorProfile.create({
      data: {
        userId: input.userId,
        displayName: input.displayName,
        slug: input.slug,
        bio: input.bio,
        genre: input.genre,
        location: input.location,
      },
    })
  },

  update(id: string, input: UpdateCreatorInput): Promise<CreatorProfile> {
    return prisma.creatorProfile.update({
      where: { id },
      data: input,
    })
  },
}
