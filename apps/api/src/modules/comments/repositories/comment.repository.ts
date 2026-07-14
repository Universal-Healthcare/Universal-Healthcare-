import { prisma } from '../../../shared/database/prisma.js'
import type { Comment, UpdateCommentPayload } from '../types/comment.types.js'

type RawComment = {
  id: string
  userId: string
  playlistId: string
  parentId: string | null
  body: string
  createdAt: Date
  updatedAt: Date
}

function commentFromPrisma(raw: RawComment): Comment {
  return { ...raw }
}

export const commentRepository = {
  async listTopLevelForPlaylist(
    playlistId: string,
    page: number,
    pageSize: number
  ): Promise<{ items: Comment[]; total: number }> {
    const [rows, total] = await Promise.all([
      prisma.comment.findMany({
        where: { playlistId, parentId: null },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.comment.count({
        where: { playlistId, parentId: null },
      }),
    ])
    return { items: rows.map(commentFromPrisma), total }
  },

  async listReplies(parentId: string): Promise<Comment[]> {
    const rows = await prisma.comment.findMany({
      where: { parentId },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(commentFromPrisma)
  },

  async findById(id: string): Promise<Comment | null> {
    const row = await prisma.comment.findUnique({ where: { id } })
    return row ? commentFromPrisma(row) : null
  },

  async create(input: {
    userId: string
    playlistId: string
    parentId: string | null
    body: string
  }): Promise<Comment> {
    const row = await prisma.comment.create({ data: input })
    return commentFromPrisma(row)
  },

  async update(id: string, input: UpdateCommentPayload): Promise<Comment> {
    const row = await prisma.comment.update({ where: { id }, data: input })
    return commentFromPrisma(row)
  },

  async delete(id: string): Promise<void> {
    await prisma.comment.delete({ where: { id } })
  },

  // ───────────────────────────────────────────────────────────────────
  //  Search (public-playlist comments only) — backing store for the
  //  Search module. Privacy gate: only comments whose parent playlist is
  //  `isPublic: true` are returned, enforced via a Prisma relation filter
  //  on `playlist: { isPublic: true }`. This is the same rationale as
  //  `commentService.getById`: a direct id lookup must not surface the
  //  body of a comment whose parent has been flipped to private.
  // ───────────────────────────────────────────────────────────────────

  async searchPublic(
    tokens: string[],
    take: number
  ): Promise<Comment[]> {
    const rows = await prisma.comment.findMany({
      where: {
        playlist: { isPublic: true },
        AND: tokens.map((token) => ({
          body: { contains: token },
        })),
      },
      orderBy: { createdAt: 'desc' },
      take,
    })
    return rows.map(commentFromPrisma)
  },

  countPublicSearch(tokens: string[]): Promise<number> {
    return prisma.comment.count({
      where: {
        playlist: { isPublic: true },
        AND: tokens.map((token) => ({
          body: { contains: token },
        })),
      },
    })
  },
}
