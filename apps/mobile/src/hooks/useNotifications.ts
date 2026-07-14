import type {
  ListNotificationsResponse,
  NotificationResponse,
} from '@universal-healthcare/shared'
import { useCallback, useEffect, useState } from 'react'
import { ApiError, apiFetch } from '../services/api-client'
import { useAuth } from './useAuth'

interface UseNotificationsResult {
  data: NotificationResponse[]
  pagination: ListNotificationsResponse['pagination'] | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const PAGE_SIZE = 20

// Auth-required inbox read. Hook no-ops cleanly if the user is not signed in
// (the auth context is still loading, or they logged out mid-session).
export function useNotifications(): UseNotificationsResult {
  const { token } = useAuth()
  const [data, setData] = useState<NotificationResponse[]>([])
  const [pagination, setPagination] = useState<
    ListNotificationsResponse['pagination'] | null
  >(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) {
      setData([])
      setPagination(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams({
        page: '1',
        pageSize: String(PAGE_SIZE),
      })
      const result = await apiFetch<ListNotificationsResponse>(
        `/api/notifications?${qs.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setData(result.data)
      setPagination(result.pagination)
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to load notifications'
      )
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  return { data, pagination, loading, error, refresh: load }
}

interface UseNotificationActionsResult {
  markRead: (id: string) => Promise<NotificationResponse>
  markAllRead: () => Promise<{ updated: number }>
  remove: (id: string) => Promise<void>
  loading: boolean
  error: string | null
}

// All write paths are auth-gated server-side, so the hook throws if no token.
// Caller is expected to invoke `refresh()` on the read hook after mutations
// (no internal cross-hook wiring; keeps the data layer orthogonal).
export function useNotificationActions(): UseNotificationActionsResult {
  const { token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const markRead = useCallback(
    async (id: string) => {
      if (!token) throw new ApiError(401, 'Not authenticated')
      setLoading(true)
      setError(null)
      try {
        return await apiFetch<NotificationResponse>(
          `/api/notifications/${encodeURIComponent(id)}/read`,
          { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } }
        )
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : 'Failed to mark as read'
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [token]
  )

  const markAllRead = useCallback(async () => {
    if (!token) throw new ApiError(401, 'Not authenticated')
    setLoading(true)
    setError(null)
    try {
      return await apiFetch<{ updated: number }>(
        '/api/notifications/read-all',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      )
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Failed to mark all as read'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [token])

  const remove = useCallback(
    async (id: string) => {
      if (!token) throw new ApiError(401, 'Not authenticated')
      setLoading(true)
      setError(null)
      try {
        await apiFetch<void>(`/api/notifications/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : 'Failed to delete notification'
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [token]
  )

  return { markRead, markAllRead, remove, loading, error }
}
