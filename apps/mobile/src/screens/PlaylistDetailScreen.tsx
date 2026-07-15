import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import type { PlaylistResponse, TrackResponse } from '@universal-healthcare/shared'
import { ApiError, apiFetch } from '../services/api-client'
import { useAuth } from '../hooks/useAuth'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; playlist: PlaylistResponse }

interface Props {
  playlistId: string
  onBack: () => void
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function TrackRow({ track, position }: { track: TrackResponse; position: number }) {
  return (
    <View style={styles.trackRow}>
      <Text style={styles.trackPosition}>{position}</Text>
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {track.title}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {track.artist}
        </Text>
      </View>
      <Text style={styles.trackDuration}>
        {formatDuration(track.duration)}
      </Text>
    </View>
  )
}

export default function PlaylistDetailScreen({ playlistId, onBack }: Props) {
  const { token } = useAuth()
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const hasLoadedOnce = useRef(false)

  useEffect(() => {
    if (state.status === 'ok' || state.status === 'error') {
      hasLoadedOnce.current = true
    }
  }, [state.status])

  const fetchPlaylist = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true)
    try {
      if (token) {
        try {
          const result = await apiFetch<{ data: PlaylistResponse }>(
            `/api/playlists/${encodeURIComponent(playlistId)}`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
          setRefreshError(null)
          setState({ status: 'ok', playlist: result.data })
          return
        } catch (err) {
          const status = err instanceof ApiError ? err.status : undefined
          if (status !== 404) throw err
        }
      }
      const result = await apiFetch<{ data: PlaylistResponse }>(
        `/api/playlists/public/${encodeURIComponent(playlistId)}`
      )
      setRefreshError(null)
      setState({ status: 'ok', playlist: result.data })
    } catch {
      if (isRefresh) {
        setRefreshError('Failed to refresh playlist')
      } else {
        setState({ status: 'error', message: 'Playlist not found' })
      }
    } finally {
      if (isRefresh) setRefreshing(false)
    }
  }, [playlistId, token])

  const handleRefresh = useCallback(() => fetchPlaylist(true), [fetchPlaylist])

  useEffect(() => {
    fetchPlaylist(false)
  }, [fetchPlaylist])

  // ── Loading (first load only) ────────────────────────────────────────────
  if (state.status === 'loading' && !hasLoadedOnce.current) {
    return (
      <View style={styles.screen}>
        <BackButton onPress={onBack} />
        <View style={styles.center}>
          <ActivityIndicator testID="loading-indicator" size="large" />
        </View>
      </View>
    )
  }

  // ── Error ───────────────────────────────────────────────────────────────
  if (state.status === 'error') {
    return (
      <View style={styles.screen}>
        <BackButton onPress={onBack} />
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Not Found</Text>
          <Text style={styles.errorText}>{state.message}</Text>
        </View>
      </View>
    )
  }

  // ── OK ──────────────────────────────────────────────────────────────────
  const playlist = state.status === 'ok' ? state.playlist : null

  return (
    <View style={styles.screen}>
      <BackButton onPress={onBack} />

      {/* ── Inline error banner (post-first-load refresh failures) ──────── */}
      {refreshError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{refreshError}</Text>
        </View>
      )}

      {/* ── Header ────────────────────────────────────────────────────── */}
      {playlist && (
        <View style={styles.detailHeader}>
          <View style={styles.titleRow}>
            <Text style={styles.heading} numberOfLines={1}>
              {playlist.title}
            </Text>
            <View
              style={[
                styles.badge,
                playlist.isPublic ? styles.badgePublic : styles.badgePrivate,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  playlist.isPublic
                    ? styles.badgeTextPublic
                    : styles.badgeTextPrivate,
                ]}
              >
                {playlist.isPublic ? 'Public' : 'Private'}
              </Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            {playlist.tracks.length}{' '}
            {playlist.tracks.length === 1 ? 'track' : 'tracks'} · Created{' '}
            {new Date(playlist.createdAt).toLocaleDateString()}
          </Text>
        </View>
      )}

      {/* ── Track list ────────────────────────────────────────────────── */}
      {playlist && playlist.tracks.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>This playlist is empty</Text>
          <Text style={styles.emptySubtitle}>
            Add tracks to get started
          </Text>
        </View>
      ) : playlist ? (
        <FlatList
          data={playlist.tracks}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <TrackRow track={item} position={index + 1} />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.trackList}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      ) : null}
    </View>
  )
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.backButton,
        pressed && styles.backButtonPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Go back to playlists"
    >
      <Text style={styles.backButtonText}>← Back to playlists</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  // Back
  backButton: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButtonPressed: {
    opacity: 0.6,
  },
  backButtonText: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: '500',
  },

  // Error banner (inline, not full-screen)
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  errorBannerText: {
    color: '#b00020',
    fontSize: 13,
  },

  // Header
  detailHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#f3f4f6',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgePublic: {
    backgroundColor: '#d1fae5',
  },
  badgePrivate: {
    backgroundColor: '#e5e7eb',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  badgeTextPublic: {
    color: '#065f46',
  },
  badgeTextPrivate: {
    color: '#6b7280',
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
  },

  // Track list
  trackList: {
    paddingVertical: 8,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  trackPosition: {
    width: 28,
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'right',
    marginRight: 12,
  },
  trackInfo: {
    flex: 1,
    marginRight: 12,
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111',
  },
  trackArtist: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  trackDuration: {
    fontSize: 13,
    color: '#9ca3af',
    fontVariant: ['tabular-nums'],
  },

  // Empty
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 17,
    color: '#9ca3af',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },

  // Error
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 8,
  },
  errorText: {
    color: '#6b7280',
    fontSize: 15,
  },

  // Separator
  separator: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 20,
  },
})
