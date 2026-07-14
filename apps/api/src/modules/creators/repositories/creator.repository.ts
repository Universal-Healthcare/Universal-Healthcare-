import { prisma } from '../../../shared/database/prisma.js'
import type {
  CreateCreatorInput,
  CreatorProfile,
  UpdateCreatorInput,
} from '../types/creator.types.js'

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
      orderBy: { createdAt: 'desc' },
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

  create(
    input: CreateCreatorInput & { slug: string }
  ): Promise<CreatorProfile> {
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

  // ───────────────────────────────────────────────────────────────────
  //  Search — backing store for the cross-entity Search module.
  //  Called by `searchService.search`; the service does the scoring and
  //  cross-entity stitching. The `tokens` array is AND-ed: every token
  //  must match at least one of the three searchable fields.
  //
  //  Case sensitivity: `contains` is case-sensitive on both SQLite and
  //  Postgres for the String column type, matching the existing pattern
  //  in `listMany` above. Prisma's `mode: 'insensitive'` is only
  //  supported on Postgres / MongoDB (not SQLite, per Prisma's case-
  //  sensitivity docs), and we don't want a runtime DB-provider branch
  //  in the repository. Case-insensitive search is a future v2 feature
  //  (would require raw SQL with `LOWER(col) LIKE LOWER(?)` or a Prisma
  //  version upgrade that adds SQLite support for `mode`).
  // ───────────────────────────────────────────────────────────────────

  search(tokens: string[], take: number): Promise<CreatorProfile[]> {
    return prisma.creatorProfile.findMany({
      where: {
        AND: tokens.map((token) => ({
          OR: [
            { displayName: { contains: token } },
            { slug: { contains: token } },
            { bio: { contains: token } },
          ],
        })),
      },
      orderBy: { createdAt: 'desc' },
      take,
    })
  },

  countSearch(tokens: string[]): Promise<number> {
    return prisma.creatorProfile.count({
      where: {
        AND: tokens.map((token) => ({
          OR: [
            { displayName: { contains: token } },
            { slug: { contains: token } },
            { bio: { contains: token } },
          ],
        })),
      },
    })
  },
}
