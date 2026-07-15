'use client'

import type { PlaylistResponse, TrackResponse } from '@universal-healthcare/shared'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../../lib/auth-context'
import {
  deletePlaylist,
  getMyPlaylist,
  getPublicPlaylist,
  updatePlaylist,
} from '../../../lib/playlist-client'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; playlist: PlaylistResponse }

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface TrackRowProps {
  track: TrackResponse
  position: number
}

function TrackRow({ track, position }: TrackRowProps) {
  return (
    <tr
      style={{
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--hover-bg, #f3f4f6)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
      }}
    >
      <td
        style={{
          padding: '0.625rem 0.75rem',
          fontSize: '0.8125rem',
          color: 'var(--muted, #9ca3af)',
          textAlign: 'right',
          width: '2rem',
        }}
      >
        {position}
      </td>
      <td style={{ padding: '0.625rem 0.75rem' }}>
        <span style={{ fontWeight: 500, fontSize: '0.9375rem' }}>
          {track.title}
        </span>
      </td>
      <td
        style={{
          padding: '0.625rem 0.75rem',
          fontSize: '0.875rem',
          color: 'var(--muted, #6b7280)',
        }}
      >
        {track.artist}
      </td>
      <td
        style={{
          padding: '0.625rem 0.75rem',
          fontSize: '0.8125rem',
          color: 'var(--muted, #9ca3af)',
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatDuration(track.duration)}
      </td>
    </tr>
  )
}

export default function PlaylistDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { token } = useAuth()
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editIsPublic, setEditIsPublic] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      if (token) {
        try {
          const result = await getMyPlaylist(token, params.id)
          setState({ status: 'ok', playlist: result.data })
          return
        } catch (err) {
          const status = (err as { status?: number }).status
          if (status !== 404) throw err
        }
      }
      const result = await getPublicPlaylist(params.id)
      setState({ status: 'ok', playlist: result.data })
    } catch {
      setState({ status: 'error', message: 'Playlist not found' })
    }
  }, [params.id, token])

  useEffect(() => {
    load()
  }, [load])

  const startEditing = useCallback(() => {
    if (state.status !== 'ok') return
    setEditTitle(state.playlist.title)
    setEditIsPublic(state.playlist.isPublic)
    setEditError(null)
    setDeleteConfirm(false)
    setEditing(true)
  }, [state])

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!token || !editTitle.trim()) return
      setSaving(true)
      setEditError(null)
      try {
        const result = await updatePlaylist(token, params.id, {
          title: editTitle.trim(),
          isPublic: editIsPublic,
        })
        setState({ status: 'ok', playlist: result.data })
        setEditing(false)
      } catch (err) {
        setEditError(
          err instanceof Error ? err.message : 'Failed to save changes'
        )
      } finally {
        setSaving(false)
      }
    },
    [token, params.id, editTitle, editIsPublic]
  )

  const handleDelete = useCallback(async () => {
    if (!token) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deletePlaylist(token, params.id)
      router.push('/playlists')
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : 'Failed to delete playlist'
      )
      setDeleting(false)
      setDeleteConfirm(false)
    }
  }, [token, params.id, router])

  // ── Loading ─────────────────────────────────────────────────────────────
  if (state.status === 'loading') {
    return (
      <main>
        <p style={{ color: 'var(--muted, #6b7280)' }}>Loading…</p>
      </main>
    )
  }

  // ── Error ───────────────────────────────────────────────────────────────
  if (state.status === 'error') {
    return (
      <main>
        <Link
          href="/playlists"
          style={{
            display: 'inline-block',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            color: '#2563eb',
            textDecoration: 'none',
          }}
        >
          ← Back to playlists
        </Link>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>
          Not Found
        </h1>
        <p>{state.message}</p>
      </main>
    )
  }

  // ── OK ──────────────────────────────────────────────────────────────────
  const { playlist } = state

  return (
    <main>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1.25rem',
        }}
      >
        <Link
          href="/playlists"
          style={{
            fontSize: '0.875rem',
            color: '#2563eb',
            textDecoration: 'none',
          }}
        >
          ← Back to playlists
        </Link>

        {token && !editing && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={startEditing}
              style={{
                padding: '0.375rem 0.75rem',
                fontSize: '0.8125rem',
                fontWeight: 500,
                borderRadius: '0.5rem',
                border: '1px solid var(--border, #d1d5db)',
                background: 'transparent',
                color: 'var(--muted, #6b7280)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#2563eb'
                e.currentTarget.style.color = '#2563eb'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor =
                  'var(--border, #d1d5db)'
                e.currentTarget.style.color = 'var(--muted, #6b7280)'
              }}
            >
              Edit
            </button>

            {deleteConfirm ? (
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    borderRadius: '0.5rem',
                    border: 'none',
                    background: deleting ? '#fca5a5' : '#b00020',
                    color: '#fff',
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    opacity: deleting ? 0.6 : 1,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!deleting)
                      (e.currentTarget.style.background = '#8b0015')
                  }}
                  onMouseLeave={(e) => {
                    if (!deleting)
                      (e.currentTarget.style.background = '#b00020')
                  }}
                >
                  {deleting ? 'Deleting…' : 'Confirm'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirm(false)
                    setDeleteError(null)
                  }}
                  disabled={deleting}
                  style={{
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    borderRadius: '0.5rem',
                    border: '1px solid var(--border, #d1d5db)',
                    background: 'transparent',
                    color: 'var(--muted, #6b7280)',
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    opacity: deleting ? 0.5 : 1,
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setDeleteConfirm(true)}
                style={{
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  borderRadius: '0.5rem',
                  border: '1px solid transparent',
                  background: 'transparent',
                  color: 'var(--muted, #6b7280)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#b00020'
                  e.currentTarget.style.borderColor = '#fecaca'
                  e.currentTarget.style.background = '#fef2f2'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--muted, #6b7280)'
                  e.currentTarget.style.borderColor = 'transparent'
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {deleteError && (
        <p role="alert" style={{ marginBottom: '1rem' }}>
          {deleteError}
        </p>
      )}

      {/* ── Edit form ──────────────────────────────────────────────────── */}
      {editing ? (
        <form
          onSubmit={handleSave}
          style={{
            background: 'var(--card-bg, #f9fafb)',
            border: '1px solid var(--border, #e5e7eb)',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <div>
            <label htmlFor="edit-title">Title</label>
            <input
              id="edit-title"
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              required
              maxLength={200}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                fontSize: '1rem',
                border: '1px solid var(--border, #d1d5db)',
                borderRadius: '0.5rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 400,
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            <input
              type="checkbox"
              checked={editIsPublic}
              onChange={(e) => setEditIsPublic(e.target.checked)}
              style={{ width: 'auto', cursor: 'pointer' }}
            />
            Make this playlist public
          </label>

          {editError && <p role="alert">{editError}</p>}

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="submit"
              disabled={saving || !editTitle.trim()}
              style={{
                padding: '0.5rem 1.25rem',
                fontWeight: 600,
                fontSize: '0.875rem',
                borderRadius: '0.5rem',
                border: 'none',
                background:
                  saving || !editTitle.trim()
                    ? 'var(--muted, #d1d5db)'
                    : '#1a7f37',
                color: '#fff',
                cursor:
                  saving || !editTitle.trim() ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
                opacity: saving || !editTitle.trim() ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={saving}
              style={{
                padding: '0.5rem 1.25rem',
                fontWeight: 500,
                fontSize: '0.875rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--border, #d1d5db)',
                background: 'transparent',
                color: 'var(--muted, #6b7280)',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          {/* ── Header ────────────────────────────────────────────────── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '0.5rem',
            }}
          >
            <h1
              style={{
                fontSize: '1.75rem',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {playlist.title}
            </h1>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 500,
                padding: '0.125rem 0.5rem',
                borderRadius: '999px',
                background: playlist.isPublic
                  ? '#d1fae5'
                  : 'var(--muted, #e5e7eb)',
                color: playlist.isPublic ? '#065f46' : '#6b7280',
                flexShrink: 0,
              }}
            >
              {playlist.isPublic ? 'Public' : 'Private'}
            </span>
          </div>

          <div
            style={{
              fontSize: '0.8125rem',
              color: 'var(--muted, #6b7280)',
              marginBottom: '1.5rem',
            }}
          >
            {playlist.tracks.length}{' '}
            {playlist.tracks.length === 1 ? 'track' : 'tracks'} · Created{' '}
            {new Date(playlist.createdAt).toLocaleDateString()}
          </div>
        </>
      )}

      {/* ── Track list ──────────────────────────────────────────────────── */}
      {playlist.tracks.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '2.5rem 1rem',
            color: 'var(--muted, #9ca3af)',
            border: '1px dashed var(--border, #e5e7eb)',
            borderRadius: '0.75rem',
          }}
        >
          <p style={{ fontSize: '1rem', margin: 0 }}>
            This playlist is empty
          </p>
          <p style={{ fontSize: '0.8125rem', margin: '0.25rem 0 0' }}>
            Add tracks to get started
          </p>
        </div>
      ) : (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: '2px solid var(--border, #e5e7eb)',
              }}
            >
              <th
                style={{
                  textAlign: 'right',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: 'var(--muted, #9ca3af)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  width: '2rem',
                }}
              >
                #
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: 'var(--muted, #9ca3af)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Title
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: 'var(--muted, #9ca3af)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Artist
              </th>
              <th
                style={{
                  textAlign: 'right',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  color: 'var(--muted, #9ca3af)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Duration
              </th>
            </tr>
          </thead>
          <tbody>
            {playlist.tracks.map((track, i) => (
              <TrackRow key={track.id} track={track} position={i + 1} />
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}
