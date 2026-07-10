import { type Prisma } from '@prisma/client'
import { prisma } from '../database/prisma.js'
import type { Pagination, PaginationMeta } from './pagination.types.js'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

function clampPageSize(value: number | undefined): number {
  if (!value) return DEFAULT_PAGE_SIZE
  return Math.min(MAX_PAGE_SIZE, Math.max(1, value))
}

function clampPage(value: number | undefined): number {
  if (!value) return DEFAULT_PAGE
  return Math.max(1, value)
}

function metaFromTotal(
  page: number,
  pageSize: number,
  total: number
): PaginationMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
}

export interface PaginateArgs {
  page?: number
  pageSize?: number
  where?: Prisma.CreatorProfileWhereInput
  orderBy?: Prisma.CreatorProfileOrderByWithRelationInput
  select?: Prisma.CreatorProfileSelect
  include?: Prisma.CreatorProfileInclude
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: PaginationMeta
}

export async function paginateCreators<T = unknown>(
  args: PaginateArgs = {}
): Promise<PaginatedResult<T>> {
  const page = clampPage(args.page)
  const pageSize = clampPageSize(args.pageSize)
  const skip = (page - 1) * pageSize

  const [data, total] = await Promise.all([
    prisma.creatorProfile.findMany({
      ...(args.where ? { where: args.where } : {}),
      ...(args.orderBy
        ? { orderBy: args.orderBy }
        : { orderBy: { createdAt: 'desc' as const } }),
      ...(args.select ? { select: args.select } : {}),
      ...(args.include ? { include: args.include } : {}),
      skip,
      take: pageSize,
    }),
    prisma.creatorProfile.count({
      ...(args.where ? { where: args.where } : {}),
    }),
  ])

  return { data: data as T[], pagination: metaFromTotal(page, pageSize, total) }
}

export function paginationFromRequest(input: Pagination): {
  page: number
  pageSize: number
} {
  return {
    page: clampPage(input.page),
    pageSize: clampPageSize(input.pageSize),
  }
}
