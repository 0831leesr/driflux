"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import type { VideoData } from "@/components/video-card"

/* ═══════════════════════════════════════════════════════════════
   Local Storage Keys
   ═══════════════════════════════════════════════════════════════ */

const STORAGE_KEY_GAMES = "driflux_favorite_games"
const STORAGE_KEY_TAGS = "driflux_favorite_tags"
const STORAGE_KEY_STREAMERS = "driflux_favorite_streamers"
const STORAGE_KEY_VIDEOS = "driflux_saved_videos"
const MAX_SAVED_VIDEOS = 500

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
  addFavorite: (gameId: number) => void
  removeFavorite: (gameId: number) => void
  toggleFavorite: (gameId: number) => void
  isInitialized: boolean
}

interface FavoriteTagsContextType {
  favorites: string[]
  isFavorite: (tagName: string) => boolean
  addFavorite: (tagName: string) => void
  removeFavorite: (tagName: string) => void
  toggleFavorite: (tagName: string) => void
  isInitialized: boolean
}

interface FavoriteStreamersContextType {
  favorites: FollowedStreamer[]
  isFavorite: (channelId: string) => boolean
  addFavorite: (streamer: FollowedStreamer) => void
  removeFavorite: (channelId: string) => void
  toggleFavorite: (streamer: FollowedStreamer) => void
  isInitialized: boolean
}

/* ═══════════════════════════════════════════════════════════════
   Create Contexts
   ═══════════════════════════════════════════════════════════════ */

const FavoriteGamesContext = createContext<FavoriteGamesContextType | undefined>(undefined)
const FavoriteTagsContext = createContext<FavoriteTagsContextType | undefined>(undefined)
const FavoriteStreamersContext = createContext<FavoriteStreamersContextType | undefined>(undefined)
const FavoriteVideosContext = createContext<FavoriteVideosContextType | undefined>(undefined)

/* ═══════════════════════════════════════════════════════════════
   Helper Functions
   ═══════════════════════════════════════════════════════════════ */

function getStoredArray<T>(key: string, defaultValue: T[]): T[] {
  if (typeof window === "undefined") return defaultValue
  
  try {
    const stored = localStorage.getItem(key)
    if (stored === null) {
      return defaultValue
    }
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : defaultValue
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error)
    return defaultValue
  }
}

function setStoredArray<T>(key: string, value: T[]): void {
  if (typeof window === "undefined") return
  
  try {
    localStorage.setItem(key, JSON.stringify(value))
    // Dispatch custom event for cross-component synchronization
    window.dispatchEvent(new CustomEvent('localStorageChange', { 
      detail: { key, value } 
    }))
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error)
  }
}

function getStoredStreamers(): FollowedStreamer[] {
  const raw = getStoredArray<{ channelId?: string; streamerName?: string; channelImageUrl?: string }>(STORAGE_KEY_STREAMERS, [])
  return raw
    .filter((s) => s && typeof s.channelId === "string" && s.channelId.trim() !== "")
    .map((s) => ({
      channelId: String(s!.channelId).trim(),
      streamerName: typeof s!.streamerName === "string" ? s!.streamerName : "Unknown",
      channelImageUrl: typeof s!.channelImageUrl === "string" ? s.channelImageUrl : undefined,
    }))
}

function setStoredStreamers(value: FollowedStreamer[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY_STREAMERS, JSON.stringify(value))
    window.dispatchEvent(new CustomEvent("localStorageChange", {
      detail: { key: STORAGE_KEY_STREAMERS, value },
    }))
  } catch (error) {
    console.error(`Error writing ${STORAGE_KEY_STREAMERS} to localStorage:`, error)
  }
}

function getStoredVideos(): VideoData[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY_VIDEOS)
    if (stored === null) return []
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
    window.dispatchEvent(new CustomEvent('localStorageChange', {
      detail: { key: STORAGE_KEY_VIDEOS, value }
    }))
  } catch (error) {
    console.error(`Error writing ${STORAGE_KEY_VIDEOS} to localStorage:`, error)
  }
}

/* ═══════════════════════════════════════════════════════════════
   Favorites Provider Component
   ═══════════════════════════════════════════════════════════════ */

export function FavoritesProvider({ children }: { children: ReactNode }) {
  // Games state
  const [favoriteGames, setFavoriteGames] = useState<number[]>([])
  const [gamesInitialized, setGamesInitialized] = useState(false)

  // Tags state
  const [favoriteTags, setFavoriteTags] = useState<string[]>([])
  const [tagsInitialized, setTagsInitialized] = useState(false)

  // Streamers state
  const [favoriteStreamers, setFavoriteStreamers] = useState<FollowedStreamer[]>([])
  const [streamersInitialized, setStreamersInitialized] = useState(false)

  // Videos state (saved replay videos)
  const [savedVideos, setSavedVideos] = useState<VideoData[]>([])
  const [videosInitialized, setVideosInitialized] = useState(false)

  // Initialize from localStorage on mount
  useEffect(() => {
    const storedGames = getStoredArray<number>(STORAGE_KEY_GAMES, [])
    const storedTags = getStoredArray<string>(STORAGE_KEY_TAGS, [])
    const storedStreamers = getStoredStreamers()
    const storedVideos = getStoredVideos()

    setFavoriteGames(storedGames)
    setFavoriteTags(storedTags)
    setFavoriteStreamers(storedStreamers)
    setSavedVideos(storedVideos)
    setGamesInitialized(true)
    setTagsInitialized(true)
    setStreamersInitialized(true)
    setVideosInitialized(true)
  }, [])

  // Save games to localStorage whenever they change
  useEffect(() => {
    if (gamesInitialized) {
      setStoredArray(STORAGE_KEY_GAMES, favoriteGames)
    }
  }, [favoriteGames, gamesInitialized])

  // Save tags to localStorage whenever they change
  useEffect(() => {
    if (tagsInitialized) {
      setStoredArray(STORAGE_KEY_TAGS, favoriteTags)
    }
  }, [favoriteTags, tagsInitialized])

  // Save streamers to localStorage whenever they change
  useEffect(() => {
    if (streamersInitialized) {
      setStoredStreamers(favoriteStreamers)
    }
  }, [favoriteStreamers, streamersInitialized])

  // Save videos to localStorage whenever they change
  useEffect(() => {
    if (videosInitialized) {
      setStoredVideos(savedVideos)
    }
  }, [savedVideos, videosInitialized])

  // Videos context value
  const videosContextValue: FavoriteVideosContextType = {
    savedVideos,
    isInitialized: videosInitialized,
    isSaved: (videoId: string) => savedVideos.some((v) => v.videoId === videoId),
    addSavedVideo: (video: VideoData) => {
      setSavedVideos((prev) => {
        if (prev.some((v) => v.videoId === video.videoId)) return prev
        const next = [...prev, video]
        return next.length > MAX_SAVED_VIDEOS ? next.slice(-MAX_SAVED_VIDEOS) : next
      })
    },
    removeSavedVideo: (videoId: string) => {
      setSavedVideos((prev) => prev.filter((v) => v.videoId !== videoId))
    },
    toggleSavedVideo: (video: VideoData) => {
      setSavedVideos((prev) => {
        const exists = prev.some((v) => v.videoId === video.videoId)
        if (exists) return prev.filter((v) => v.videoId !== video.videoId)
        const next = [...prev, video]
        return next.length > MAX_SAVED_VIDEOS ? next.slice(-MAX_SAVED_VIDEOS) : next
      })
    },
  }

  // Games context value
  const gamesContextValue: FavoriteGamesContextType = {
    favorites: favoriteGames,
    isInitialized: gamesInitialized,
    
    isFavorite: (gameId: number) => {
      return favoriteGames.includes(gameId)
    },
    
    addFavorite: (gameId: number) => {
      setFavoriteGames((prev) => {
        if (prev.includes(gameId)) return prev
        return [...prev, gameId]
      })
    },
    
    removeFavorite: (gameId: number) => {
      setFavoriteGames((prev) => prev.filter((id) => id !== gameId))
    },
    
    toggleFavorite: (gameId: number) => {
      setFavoriteGames((prev) => {
        if (prev.includes(gameId)) {
          return prev.filter((id) => id !== gameId)
        }
        return [...prev, gameId]
      })
    },
  }

  // Tags context value
  const tagsContextValue: FavoriteTagsContextType = {
    favorites: favoriteTags,
    isInitialized: tagsInitialized,
    
    isFavorite: (tagName: string) => {
      return favoriteTags.includes(tagName)
    },
    
    addFavorite: (tagName: string) => {
      setFavoriteTags((prev) => {
        if (prev.includes(tagName)) return prev
        return [...prev, tagName]
      })
    },
    
    removeFavorite: (tagName: string) => {
      setFavoriteTags((prev) => prev.filter((name) => name !== tagName))
    },
    
    toggleFavorite: (tagName: string) => {
      setFavoriteTags((prev) => {
        if (prev.includes(tagName)) {
          return prev.filter((name) => name !== tagName)
        }
        return [...prev, tagName]
      })
    },
  }

  // Streamers context value
  const streamersContextValue: FavoriteStreamersContextType = {
    favorites: favoriteStreamers,
    isInitialized: streamersInitialized,
    isFavorite: (channelId: string) =>
      favoriteStreamers.some((s) => s.channelId === channelId),
    addFavorite: (streamer: FollowedStreamer) => {
      setFavoriteStreamers((prev) => {
        if (prev.some((s) => s.channelId === streamer.channelId)) return prev
        return [...prev, streamer]
      })
    },
    removeFavorite: (channelId: string) => {
      setFavoriteStreamers((prev) =>
        prev.filter((s) => s.channelId !== channelId)
      )
    },
    toggleFavorite: (streamer: FollowedStreamer) => {
      setFavoriteStreamers((prev) => {
        const exists = prev.some((s) => s.channelId === streamer.channelId)
        if (exists) {
          return prev.filter((s) => s.channelId !== streamer.channelId)
        }
        return [...prev, streamer]
      })
    },
  }

  return (
    <FavoriteGamesContext.Provider value={gamesContextValue}>
      <FavoriteTagsContext.Provider value={tagsContextValue}>
        <FavoriteStreamersContext.Provider value={streamersContextValue}>
          <FavoriteVideosContext.Provider value={videosContextValue}>
            {children}
          </FavoriteVideosContext.Provider>
        </FavoriteStreamersContext.Provider>
      </FavoriteTagsContext.Provider>
    </FavoriteGamesContext.Provider>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Custom Hooks
   ═══════════════════════════════════════════════════════════════ */

export function useFavoriteGames(): FavoriteGamesContextType {
  const context = useContext(FavoriteGamesContext)
  if (context === undefined) {
    throw new Error("useFavoriteGames must be used within a FavoritesProvider")
  }
  return context
}

export function useFavoriteTags(): FavoriteTagsContextType {
  const context = useContext(FavoriteTagsContext)
  if (context === undefined) {
    throw new Error("useFavoriteTags must be used within a FavoritesProvider")
  }
  return context
}

export function useFavoriteStreamers(): FavoriteStreamersContextType {
  const context = useContext(FavoriteStreamersContext)
  if (context === undefined) {
    throw new Error("useFavoriteStreamers must be used within a FavoritesProvider")
  }
  return context
}

export function useFavoriteVideos(): FavoriteVideosContextType {
  const context = useContext(FavoriteVideosContext)
  if (context === undefined) {
    throw new Error("useFavoriteVideos must be used within a FavoritesProvider")
  }
  return context
}
