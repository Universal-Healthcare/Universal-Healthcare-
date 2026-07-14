import type { SearchHitResponse, SearchResponse, SearchHitType } from '@universal-healthcare/shared'
import { commentRepository } from '../../comments/repositories/comment.repository.js'
import type { Comment } from '../../comments/types/comment.types.js'
import { creatorRepository } from '../../creators/repositories/creator.repository.js'
import type { CreatorProfile } from '../../creators/types/creator.types.js'
import { playlistRepository } from '../../playlists/repositories/playlist.repository.js'
import type { Playlist } from '../../playlists/types/playlist.types.js'
import type { InternalSearchHit } from '../types/search.types.js'

// ─────────────────────────────────────────────────────────────────────────────
//  Per-entity hard cap on the rows the service pulls from the DB. This is
//  the upper bound on the in-memory merge / score / sort working set per
//  request, regardless of pagination. 50 matches the shared Zod schema's
//  `SEARCH_LIMIT_MAX`.
// ─────────────────────────────────────────────────────────────────────────────

const PER_ENTITY_TAKE = 50

const DEFAULT_TYPES: SearchHitType[] = ['creator', 'playlist', 'comment']

// ─────────────────────────────────────────────────────────────────────────────
//  Query parsing — split on whitespace, lowercase, dedupe, drop empties.
//  Returns [] for an empty / whitespace-only input, which short-circuits
//  the entire search to an empty result.
// ─────────────────────────────────────────────────────────────────────────────

function tokenize(q: string): string[] {
  const tokens = q
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0)
  return Array.from(new Set(tokens))
}

// ─────────────────────────────────────────────────────────────────────────────
//  Per-token scoring on a single field. `exact` is a 10-point match on the
//  whole string; `prefix` is 5; `substring` is 1. The `matchedFields`
//  metadata in the DTO is built from which field each token hit.
// ─────────────────────────────────────────────────────────────────────────────

function scoreToken(
  text: string,
  token: string
): { score: number; matched: boolean } {
  const lower = text.toLowerCase()
  if (lower === token) return { score: 10, matched: true }
  if (lower.startsWith(token)) return { score: 5, matched: true }
  if (lower.includes(token)) return { score: 1, matched: true }
  return { score: 0, matched: false }
}

interface ScoreResult {
  score: number
  matchedFields: string[]
}

function scoreCreator(row: CreatorProfile, tokens: string[]): ScoreResult {
  let score = 0
  const matched = new Set<string>()
  for (const token of tokens) {
    const nameHit = scoreToken(row.displayName, token)
    if (nameHit.matched) {
      score += nameHit.score
      matched.add('displayName')
    }
    if (row.bio) {
      const bioHit = scoreToken(row.bio, token)
      if (bioHit.matched) {
        score += bioHit.score
        matched.add('bio')
      }
    }
    if (row.slug) {
      const slugHit = scoreToken(row.slug, token)
      if (slugHit.matched) {
        score += slugHit.score
        matched.add('slug')
      }
    }
  }
  return { score, matchedFields: Array.from(matched) }
}

function scorePlaylist(row: Playlist, tokens: string[]): ScoreResult {
  let score = 0
  const matched = new Set<string>()
  for (const token of tokens) {
    const titleHit = scoreToken(row.title, token)
    if (titleHit.matched) {
      score += titleHit.score
      matched.add('title')
    }
  }
  return { score, matchedFields: Array.from(matched) }
}

function scoreComment(row: Comment, tokens: string[]): ScoreResult {
  let score = 0
  const matched = new Set<string>()
  for (const token of tokens) {
    const bodyHit = scoreToken(row.body, token)
    if (bodyHit.matched) {
      score += bodyHit.score
      matched.add('body')
    }
  }
  return { score, matchedFields: Array.from(matched) }
}

// ─────────────────────────────────────────────────────────────────────────────
//  DTO conversion. Reuses field shapes from the existing per-type
//  `*Response` types in `@universal-healthcare/shared`; layers on the
//  search-specific `type` discriminator + `score` + `matchedFields`.
// ─────────────────────────────────────────────────────────────────────────────

function toDto(hit: InternalSearchHit): SearchHitResponse {
  if (hit.type === 'creator') {
    return {
      type: 'creator',
      score: hit.score,
      matchedFields: hit.matchedFields,
      id: hit.row.id,
      userId: hit.row.userId,
      displayName: hit.row.displayName,
      slug: hit.row.slug,
      bio: hit.row.bio,
      genre: hit.row.genre,
      location: hit.row.location,
      isVerified: hit.row.isVerified,
      avatarUrl: hit.row.avatarUrl,
      createdAt: hit.row.createdAt.toISOString(),
    }
  }
  if (hit.type === 'playlist') {
    return {
      type: 'playlist',
      score: hit.score,
      matchedFields: hit.matchedFields,
      id: hit.row.id,
      userId: hit.row.userId,
      title: hit.row.title,
      isPublic: hit.row.isPublic,
      trackCount: hit.row.tracks.length,
      createdAt: hit.row.createdAt.toISOString(),
    }
  }
  return {
    type: 'comment',
    score: hit.score,
    matchedFields: hit.matchedFields,
    id: hit.row.id,
    userId: hit.row.userId,
    playlistId: hit.row.playlistId,
    parentId: hit.row.parentId,
    body: hit.row.body,
    createdAt: hit.row.createdAt.toISOString(),
  }
}

export const searchService = {
  async search(opts: {
    q: string
    page: number
    pageSize: number
    limit: number
    types: SearchHitType[]
  }): Promise<SearchResponse> {
    const tokens = tokenize(opts.q)
    if (tokens.length === 0) {
      return {
        data: [],
        pagination: {
          page: opts.page,
          pageSize: opts.pageSize,
          total: 0,
          totalPages: 1,
        },
      }
    }

    const types = opts.types.length > 0 ? opts.types : DEFAULT_TYPES
    const typeSet = new Set(types)
    const wantCreators = typeSet.has('creator')
    const wantPlaylists = typeSet.has('playlist')
    const wantComments = typeSet.has('comment')

    // Fan out the per-entity queries (data + count) in parallel. Disabled
    // entity types are short-circuited to empty / 0 to keep the array
    // destructuring below symmetric.
    const [creators, creatorCount, playlists, playlistCount, comments, commentCount] =
      await Promise.all([
        wantCreators
          ? creatorRepository.search(tokens, PER_ENTITY_TAKE)
          : Promise.resolve([] as CreatorProfile[]),
        wantCreators
          ? creatorRepository.countSearch(tokens)
          : Promise.resolve(0),
        wantPlaylists
          ? playlistRepository.searchPublic(tokens, PER_ENTITY_TAKE)
          : Promise.resolve([] as Playlist[]),
        wantPlaylists
          ? playlistRepository.countPublicSearch(tokens)
          : Promise.resolve(0),
        wantComments
          ? commentRepository.searchPublic(tokens, PER_ENTITY_TAKE)
          : Promise.resolve([] as Comment[]),
        wantComments
          ? commentRepository.countPublicSearch(tokens)
          : Promise.resolve(0),
      ])

    // Score in JS. The score + matchedFields are written into each
    // InternalSearchHit directly (mutation by design — the alternative
    // would be a parallel array of ScoreResults, doubling the allocations
    // for what is at most ~150 rows).
    const internalHits: InternalSearchHit[] = [
      ...creators.map((row) => {
        const s = scoreCreator(row, tokens)
        return { type: 'creator' as const, row, score: s.score, matchedFields: s.matchedFields }
      }),
      ...playlists.map((row) => {
        const s = scorePlaylist(row, tokens)
        return { type: 'playlist' as const, row, score: s.score, matchedFields: s.matchedFields }
      }),
      ...comments.map((row) => {
        const s = scoreComment(row, tokens)
        return { type: 'comment' as const, row, score: s.score, matchedFields: s.matchedFields }
      }),
    ]

    // Sort by score desc, then createdAt desc as a deterministic
    // tiebreaker (so equal-scored hits have a stable order between
    // requests).
    internalHits.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return b.row.createdAt.getTime() - a.row.createdAt.getTime()
    })

    // Pagination: per-entity counts are summed to compute the cross-entity
    // `total` and `totalPages`. The final array is sliced to the
    // requested page, capped at `limit` (which defaults to pageSize).
    const total = creatorCount + playlistCount + commentCount
    const totalPages = Math.max(1, Math.ceil(total / opts.pageSize))
    const start = (opts.page - 1) * opts.pageSize
    const pageHits = internalHits.slice(start, start + opts.limit)

    return {
      data: pageHits.map(toDto),
      pagination: {
        page: opts.page,
        pageSize: opts.pageSize,
        total,
        totalPages,
      },
    }
  },
}
