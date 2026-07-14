import type {
  SearchHitResponse,
  SearchHitType,
  SearchResponse,
} from '@universal-healthcare/shared'
import { useCallback, useEffect, useState } from 'react'
import { ApiError, apiFetch } from '../services/api-client'
import { useAuth } from './useAuth'

export interface UseSearchOptions {
  /** Required. Empty / whitespace-only short-circuits to an empty result. */
  q: string
  page?: number
  pageSize?: number
  types?: SearchHitType[]
  limit?: number
}

interface UseSearchResult {
  data: SearchHitResponse[]
  pagination: SearchResponse['pagination'] | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

// Read hook. Public — works with or without a token. Refetches whenever
// any of the opts change (so the consumer can drive pagination / type
// filtering just by mutating the opts object passed in).
export function useSearch(opts: UseSearchOptions): UseSearchResult {
  const { token } = useAuth()
  const [data, setData] = useState<SearchHitResponse[]>([])
  const [pagination, setPagination] =
    useState<SearchResponse['pagination'] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Stable serialization of the opts for the dependency array — avoids
  // re-firing the effect on every render when the caller passes a fresh
  // object literal.
  const optsKey = JSON.stringify({
    q: opts.q,
    page: opts.page ?? 1,
    pageSize: opts.pageSize ?? 20,
    types: opts.types ?? [],
    limit: opts.limit,
  })

  const load = useCallback(async () => {
    if (!opts.q || opts.q.trim().length === 0) {
      setData([])
      setPagination(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams({ q: opts.q })
      qs.set('page', String(opts.page ?? 1))
      qs.set('pageSize', String(opts.pageSize ?? 20))
      if (opts.types !== undefined) qs.set('types', opts.types.join(','))
      if (opts.limit !== undefined) qs.set('limit', String(opts.limit))
      const result = await apiFetch<SearchResponse>(
        `/api/search?${qs.toString()}`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      )
      setData(result.data)
      setPagination(result.pagination)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
    // optsKey is the canonical dep — capturing the full opts as a single
    // JSON string avoids the exhaustive-deps dance and re-firing only when
    // an opt actually changes (not on every fresh object-literal render).
  }, [optsKey, token])

  useEffect(() => {
    load()
  }, [load])

  return { data, pagination, loading, error, refresh: load }
}
