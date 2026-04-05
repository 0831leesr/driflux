"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { toast } from "sonner"
import { createBrowserClient } from "@/lib/supabase/client"
import { toggleFollow, getUserFollows } from "@/app/actions/follow"
import type { VideoData } from "@/components/video-card"
import type { ClipData } from "@/components/clip-card"

/* ═══════════════════════════════════════════════════════════════
   Local Storage Keys (videos/clips only + streamer display cache)
   ═══════════════════════════════════════════════════════════════ */

const STORAGE_KEY_VIDEOS = "richzem_saved_videos"
const LEGACY_STORAGE_KEY_VIDEOS = "driflux_saved_videos"
const STORAGE_KEY_CLIPS = "richzem_saved_clips"
const LEGACY_STORAGE_KEY_CLIPS = "driflux_saved_clips"
/** Stores streamer display metadata { [channelId]: { streamerName, channelImageUrl } } */
const STORAGE_KEY_STREAMER_META = "richzem_streamer_meta"
const LEGACY_STORAGE_KEY_STREAMER_META = "driflux_streamer_meta"

const MAX_SAVED_VIDEOS = 500
const MAX_SAVED_CLIPS = 500

/* ═══════════════════════════════════════════════════════════════
   Context Types
   ═══════════════════════════════════════════════════════════════ */

export interface FollowedStreamer {
  channelId: string
  streamerName: string
  channelImageUrl?: string
}

interface FavoriteVideosContextType {
  savedVideos: VideoData[]
  isSaved: (videoId: string) => boolean
  addSavedVideo: (video: VideoData) => void
  removeSavedVideo: (videoId: string) => void
  toggleSavedVideo: (video: VideoData) => void
  isInitialized: boolean
}

interface FavoriteGamesContextType {
  favorites: number[]
  isFavorite: (gameId: number) => boolean
  addFavorite: (gameId: number) => Promise<void>
  removeFavorite: (gameId: number) => Promise<void>
  toggleFavorite: (gameId: number) => Promise<void>
  isInitialized: boolean
}

interface FavoriteTagsContextType {
  favorites: string[]
  isFavorite: (tagName: string) => boolean
  addFavorite: (tagName: string) => Promise<void>
  removeFavorite: (tagName: string) => Promise<void>
  toggleFavorite: (tagName: string) => Promise<void>
  isInitialized: boolean
}

interface FavoriteStreamersContextType {
  favorites: FollowedStreamer[]
  isFavorite: (channelId: string) => boolean
  addFavorite: (streamer: FollowedStreamer) => Promise<void>
  removeFavorite: (channelId: string) => Promise<void>
  toggleFavorite: (streamer: FollowedStreamer) => Promise<void>
  isInitialized: boolean
}

interface FavoriteClipsContextType {
  savedClips: ClipData[]
  isSaved: (clipUID: string) => boolean
  addSavedClip: (clip: ClipData) => void
  removeSavedClip: (clipUID: string) => void
  toggleSavedClip: (clip: ClipData) => void
  isInitialized: boolean
}

/* ═══════════════════════════════════════════════════════════════
   Create Contexts
   ═══════════════════════════════════════════════════════════════ */

const FavoriteGamesContext = createContext<FavoriteGamesContextType | undefined>(undefined)
const FavoriteTagsContext = createContext<FavoriteTagsContextType | undefined>(undefined)
const FavoriteStreamersContext = createContext<FavoriteStreamersContextType | undefined>(undefined)
const FavoriteVideosContext = createContext<FavoriteVideosContextType | undefined>(undefined)
const FavoriteClipsContext = createContext<FavoriteClipsContextType | undefined>(undefined)

interface FavoritesSessionContextType {
  isAuthenticated: boolean
  /** 첫 Supabase getUser / onAuthStateChange 이후 true — UI 깜빡임 방지 */
  sessionResolved: boolean
}

const FavoritesSessionContext = createContext<FavoritesSessionContextType | undefined>(undefined)

/* ═══════════════════════════════════════════════════════════════
   localStorage helpers (videos, clips, streamer display metadata)
   ═══════════════════════════════════════════════════════════════ */

function getStoredVideos(): VideoData[] {
  if (typeof window === "undefined") return []
  try {
    let stored = localStorage.getItem(STORAGE_KEY_VIDEOS)
    if (!stored) {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY_VIDEOS)
      if (legacy) {
        localStorage.setItem(STORAGE_KEY_VIDEOS, legacy)
        stored = legacy
      }
    }
    if (!stored) return []
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function setStoredVideos(value: VideoData[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY_VIDEOS, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

function getStoredClips(): ClipData[] {
  if (typeof window === "undefined") return []
  try {
    let stored = localStorage.getItem(STORAGE_KEY_CLIPS)
    if (!stored) {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY_CLIPS)
      if (legacy) {
        localStorage.setItem(STORAGE_KEY_CLIPS, legacy)
        stored = legacy
      }
    }
    if (!stored) return []
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function setStoredClips(value: ClipData[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY_CLIPS, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

type StreamerMeta = Record<string, { streamerName: string; channelImageUrl?: string }>

function getStoredStreamerMeta(): StreamerMeta {
  if (typeof window === "undefined") return {}
  try {
    let stored = localStorage.getItem(STORAGE_KEY_STREAMER_META)
    if (!stored) {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY_STREAMER_META)
      if (legacy) {
        localStorage.setItem(STORAGE_KEY_STREAMER_META, legacy)
        stored = legacy
      }
    }
    if (!stored) return {}
    return JSON.parse(stored) ?? {}
  } catch {
    return {}
  }
}

function saveStreamerMeta(channelId: string, meta: { streamerName: string; channelImageUrl?: string }) {
  if (typeof window === "undefined") return
  try {
    const existing = getStoredStreamerMeta()
    existing[channelId] = meta
    localStorage.setItem(STORAGE_KEY_STREAMER_META, JSON.stringify(existing))
  } catch {
    /* ignore */
  }
}

function removeStreamerMeta(channelId: string) {
  if (typeof window === "undefined") return
  try {
    const existing = getStoredStreamerMeta()
    delete existing[channelId]
    localStorage.setItem(STORAGE_KEY_STREAMER_META, JSON.stringify(existing))
  } catch {
    /* ignore */
  }
}

/* ═══════════════════════════════════════════════════════════════
   Favorites Provider Component
   ═══════════════════════════════════════════════════════════════ */

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [sessionResolved, setSessionResolved] = useState(false)

  // DB-backed states
  const [favoriteGames, setFavoriteGames] = useState<number[]>([])
  const [gamesInitialized, setGamesInitialized] = useState(false)

  const [favoriteTags, setFavoriteTags] = useState<string[]>([])
  const [tagsInitialized, setTagsInitialized] = useState(false)

  const [favoriteStreamers, setFavoriteStreamers] = useState<FollowedStreamer[]>([])
  const [streamersInitialized, setStreamersInitialized] = useState(false)

  // localStorage-only states
  const [savedVideos, setSavedVideos] = useState<VideoData[]>([])
  const [videosInitialized, setVideosInitialized] = useState(false)

  const [savedClips, setSavedClips] = useState<ClipData[]>([])
  const [clipsInitialized, setClipsInitialized] = useState(false)

  /* ── Load follows from DB ── */
  async function loadFollowsFromDB() {
    try {
      const [gameIds, tagNames, streamerIds] = await Promise.all([
        getUserFollows("game"),
        getUserFollows("tag"),
        getUserFollows("streamer"),
      ])

      setFavoriteGames(gameIds.map((id) => Number(id)))
      setGamesInitialized(true)

      setFavoriteTags(tagNames)
      setTagsInitialized(true)

      const meta = getStoredStreamerMeta()
      setFavoriteStreamers(
        streamerIds.map((channelId) => ({
          channelId,
          streamerName: meta[channelId]?.streamerName ?? channelId,
          channelImageUrl: meta[channelId]?.channelImageUrl,
        })),
      )
      setStreamersInitialized(true)
    } catch {
      setGamesInitialized(true)
      setTagsInitialized(true)
      setStreamersInitialized(true)
    }
  }

  /* ── Clear follow state (on logout) ── */
  function clearFollows() {
    setFavoriteGames([])
    setFavoriteTags([])
    setFavoriteStreamers([])
    setGamesInitialized(true)
    setTagsInitialized(true)
    setStreamersInitialized(true)
    // Clear auth-required localStorage content on logout
    setSavedVideos([])
    setSavedClips([])
    try {
      localStorage.removeItem(STORAGE_KEY_VIDEOS)
      localStorage.removeItem(STORAGE_KEY_CLIPS)
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    const supabase = createBrowserClient()

    // Bootstrap auth state then load follows + localStorage-backed data
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        setIsAuthenticated(!!user)
        if (user) {
          loadFollowsFromDB()
          // Only load localStorage-backed data for authenticated users
          setSavedVideos(getStoredVideos())
          setSavedClips(getStoredClips())
        } else {
          setGamesInitialized(true)
          setTagsInitialized(true)
          setStreamersInitialized(true)
        }
        setVideosInitialized(true)
        setClipsInitialized(true)
      })
      .finally(() => setSessionResolved(true))

    // Keep in sync with auth events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionResolved(true)
      const authed = !!session?.user
      setIsAuthenticated(authed)
      if (authed) {
        loadFollowsFromDB()
        setSavedVideos(getStoredVideos())
        setSavedClips(getStoredClips())
      } else {
        clearFollows()
      }
    })

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Persist videos/clips to localStorage ── */
  useEffect(() => {
    if (videosInitialized) setStoredVideos(savedVideos)
  }, [savedVideos, videosInitialized])

  useEffect(() => {
    if (clipsInitialized) setStoredClips(savedClips)
  }, [savedClips, clipsInitialized])

  /* ════════════════════════════════════════════════════════════
     Auth guard helper — shows toast and returns true if blocked
     ════════════════════════════════════════════════════════════ */
  function requireAuth(): boolean {
    if (!isAuthenticated) {
      toast.error("로그인이 필요한 기능입니다", {
        description: "계정에 로그인한 후 이용해 주세요.",
        duration: 3000,
      })
      return true
    }
    return false
  }

  /* ════════════════════════════════════════════════════════════
     Games context value
     ════════════════════════════════════════════════════════════ */
  const gamesContextValue: FavoriteGamesContextType = {
    favorites: favoriteGames,
    isInitialized: gamesInitialized,

    isFavorite: (gameId) => favoriteGames.includes(gameId),

    addFavorite: async (gameId) => {
      if (requireAuth()) return
      if (favoriteGames.includes(gameId)) return
      setFavoriteGames((prev) => [...prev, gameId])
      const result = await toggleFollow(String(gameId), "game")
      if (result?.error) {
        setFavoriteGames((prev) => prev.filter((id) => id !== gameId))
      }
    },

    removeFavorite: async (gameId) => {
      if (requireAuth()) return
      setFavoriteGames((prev) => prev.filter((id) => id !== gameId))
      const result = await toggleFollow(String(gameId), "game")
      if (result?.error) {
        setFavoriteGames((prev) => [...prev, gameId])
      }
    },

    toggleFavorite: async (gameId) => {
      if (requireAuth()) return
      const wasFollowing = favoriteGames.includes(gameId)
      setFavoriteGames((prev) =>
        wasFollowing ? prev.filter((id) => id !== gameId) : [...prev, gameId],
      )
      const result = await toggleFollow(String(gameId), "game")
      if (result?.error) {
        setFavoriteGames((prev) =>
          wasFollowing ? [...prev, gameId] : prev.filter((id) => id !== gameId),
        )
      }
    },
  }

  /* ════════════════════════════════════════════════════════════
     Tags context value
     ════════════════════════════════════════════════════════════ */
  const tagsContextValue: FavoriteTagsContextType = {
    favorites: favoriteTags,
    isInitialized: tagsInitialized,

    isFavorite: (tagName) => favoriteTags.includes(tagName),

    addFavorite: async (tagName) => {
      if (requireAuth()) return
      if (favoriteTags.includes(tagName)) return
      setFavoriteTags((prev) => [...prev, tagName])
      const result = await toggleFollow(tagName, "tag")
      if (result?.error) {
        setFavoriteTags((prev) => prev.filter((t) => t !== tagName))
      }
    },

    removeFavorite: async (tagName) => {
      if (requireAuth()) return
      setFavoriteTags((prev) => prev.filter((t) => t !== tagName))
      const result = await toggleFollow(tagName, "tag")
      if (result?.error) {
        setFavoriteTags((prev) => [...prev, tagName])
      }
    },

    toggleFavorite: async (tagName) => {
      if (requireAuth()) return
      const wasFollowing = favoriteTags.includes(tagName)
      setFavoriteTags((prev) =>
        wasFollowing ? prev.filter((t) => t !== tagName) : [...prev, tagName],
      )
      const result = await toggleFollow(tagName, "tag")
      if (result?.error) {
        setFavoriteTags((prev) =>
          wasFollowing ? [...prev, tagName] : prev.filter((t) => t !== tagName),
        )
      }
    },
  }

  /* ════════════════════════════════════════════════════════════
     Streamers context value
     ════════════════════════════════════════════════════════════ */
  const streamersContextValue: FavoriteStreamersContextType = {
    favorites: favoriteStreamers,
    isInitialized: streamersInitialized,

    isFavorite: (channelId) => favoriteStreamers.some((s) => s.channelId === channelId),

    addFavorite: async (streamer) => {
      if (requireAuth()) return
      if (favoriteStreamers.some((s) => s.channelId === streamer.channelId)) return
      saveStreamerMeta(streamer.channelId, {
        streamerName: streamer.streamerName,
        channelImageUrl: streamer.channelImageUrl,
      })
      setFavoriteStreamers((prev) => [...prev, streamer])
      const result = await toggleFollow(streamer.channelId, "streamer")
      if (result?.error) {
        setFavoriteStreamers((prev) => prev.filter((s) => s.channelId !== streamer.channelId))
      }
    },

    removeFavorite: async (channelId) => {
      if (requireAuth()) return
      const prev = favoriteStreamers.find((s) => s.channelId === channelId)
      setFavoriteStreamers((all) => all.filter((s) => s.channelId !== channelId))
      removeStreamerMeta(channelId)
      const result = await toggleFollow(channelId, "streamer")
      if (result?.error && prev) {
        setFavoriteStreamers((all) => [...all, prev])
        saveStreamerMeta(channelId, {
          streamerName: prev.streamerName,
          channelImageUrl: prev.channelImageUrl,
        })
      }
    },

    toggleFavorite: async (streamer) => {
      if (requireAuth()) return
      const wasFollowing = favoriteStreamers.some((s) => s.channelId === streamer.channelId)
      if (wasFollowing) {
        setFavoriteStreamers((prev) => prev.filter((s) => s.channelId !== streamer.channelId))
        removeStreamerMeta(streamer.channelId)
      } else {
        saveStreamerMeta(streamer.channelId, {
          streamerName: streamer.streamerName,
          channelImageUrl: streamer.channelImageUrl,
        })
        setFavoriteStreamers((prev) => [...prev, streamer])
      }
      const result = await toggleFollow(streamer.channelId, "streamer")
      if (result?.error) {
        if (wasFollowing) {
          saveStreamerMeta(streamer.channelId, {
            streamerName: streamer.streamerName,
            channelImageUrl: streamer.channelImageUrl,
          })
          setFavoriteStreamers((prev) => [...prev, streamer])
        } else {
          setFavoriteStreamers((prev) => prev.filter((s) => s.channelId !== streamer.channelId))
          removeStreamerMeta(streamer.channelId)
        }
      }
    },
  }

  /* ════════════════════════════════════════════════════════════
     Videos context value (localStorage only)
     ════════════════════════════════════════════════════════════ */
  const videosContextValue: FavoriteVideosContextType = {
    savedVideos,
    isInitialized: videosInitialized,
    isSaved: (videoId) => savedVideos.some((v) => v.videoId === videoId),
    addSavedVideo: (video) => {
      if (requireAuth()) return
      setSavedVideos((prev) => {
        if (prev.some((v) => v.videoId === video.videoId)) return prev
        const next = [...prev, video]
        return next.length > MAX_SAVED_VIDEOS ? next.slice(-MAX_SAVED_VIDEOS) : next
      })
    },
    removeSavedVideo: (videoId) => {
      if (requireAuth()) return
      setSavedVideos((prev) => prev.filter((v) => v.videoId !== videoId))
    },
    toggleSavedVideo: (video) => {
      if (requireAuth()) return
      setSavedVideos((prev) => {
        const exists = prev.some((v) => v.videoId === video.videoId)
        if (exists) return prev.filter((v) => v.videoId !== video.videoId)
        const next = [...prev, video]
        return next.length > MAX_SAVED_VIDEOS ? next.slice(-MAX_SAVED_CLIPS) : next
      })
    },
  }

  /* ════════════════════════════════════════════════════════════
     Clips context value (localStorage only)
     ════════════════════════════════════════════════════════════ */
  const clipsContextValue: FavoriteClipsContextType = {
    savedClips,
    isInitialized: clipsInitialized,
    isSaved: (clipUID) => savedClips.some((c) => c.clipUID === clipUID),
    addSavedClip: (clip) => {
      if (requireAuth()) return
      setSavedClips((prev) => {
        if (prev.some((c) => c.clipUID === clip.clipUID)) return prev
        const next = [...prev, clip]
        return next.length > MAX_SAVED_CLIPS ? next.slice(-MAX_SAVED_CLIPS) : next
      })
    },
    removeSavedClip: (clipUID) => {
      if (requireAuth()) return
      setSavedClips((prev) => prev.filter((c) => c.clipUID !== clipUID))
    },
    toggleSavedClip: (clip) => {
      if (requireAuth()) return
      setSavedClips((prev) => {
        const exists = prev.some((c) => c.clipUID === clip.clipUID)
        if (exists) return prev.filter((c) => c.clipUID !== clip.clipUID)
        const next = [...prev, clip]
        return next.length > MAX_SAVED_CLIPS ? next.slice(-MAX_SAVED_CLIPS) : next
      })
    },
  }

  const sessionContextValue: FavoritesSessionContextType = {
    isAuthenticated,
    sessionResolved,
  }

  return (
    <FavoritesSessionContext.Provider value={sessionContextValue}>
      <FavoriteGamesContext.Provider value={gamesContextValue}>
        <FavoriteTagsContext.Provider value={tagsContextValue}>
          <FavoriteStreamersContext.Provider value={streamersContextValue}>
            <FavoriteVideosContext.Provider value={videosContextValue}>
              <FavoriteClipsContext.Provider value={clipsContextValue}>
                {children}
              </FavoriteClipsContext.Provider>
            </FavoriteVideosContext.Provider>
          </FavoriteStreamersContext.Provider>
        </FavoriteTagsContext.Provider>
      </FavoriteGamesContext.Provider>
    </FavoritesSessionContext.Provider>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Custom Hooks
   ═══════════════════════════════════════════════════════════════ */

export function useFavoriteGames(): FavoriteGamesContextType {
  const context = useContext(FavoriteGamesContext)
  if (!context) throw new Error("useFavoriteGames must be used within a FavoritesProvider")
  return context
}

export function useFavoriteTags(): FavoriteTagsContextType {
  const context = useContext(FavoriteTagsContext)
  if (!context) throw new Error("useFavoriteTags must be used within a FavoritesProvider")
  return context
}

export function useFavoriteStreamers(): FavoriteStreamersContextType {
  const context = useContext(FavoriteStreamersContext)
  if (!context) throw new Error("useFavoriteStreamers must be used within a FavoritesProvider")
  return context
}

export function useFavoriteVideos(): FavoriteVideosContextType {
  const context = useContext(FavoriteVideosContext)
  if (!context) throw new Error("useFavoriteVideos must be used within a FavoritesProvider")
  return context
}

export function useFavoriteClips(): FavoriteClipsContextType {
  const context = useContext(FavoriteClipsContext)
  if (!context) throw new Error("useFavoriteClips must be used within a FavoritesProvider")
  return context
}

export function useFavoritesSession(): FavoritesSessionContextType {
  const context = useContext(FavoritesSessionContext)
  if (!context) throw new Error("useFavoritesSession must be used within a FavoritesProvider")
  return context
}
