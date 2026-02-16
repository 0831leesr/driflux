"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

/* ═══════════════════════════════════════════════════════════════
   Local Storage Keys
   ═══════════════════════════════════════════════════════════════ */

const STORAGE_KEY_GAMES = "driflux_favorite_games"
const STORAGE_KEY_TAGS = "driflux_favorite_tags"

/* ═══════════════════════════════════════════════════════════════
   Context Types
   ═══════════════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════════════
   Create Contexts
   ═══════════════════════════════════════════════════════════════ */

const FavoriteGamesContext = createContext<FavoriteGamesContextType | undefined>(undefined)
const FavoriteTagsContext = createContext<FavoriteTagsContextType | undefined>(undefined)

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

  // Initialize from localStorage on mount
  useEffect(() => {
    const storedGames = getStoredArray<number>(STORAGE_KEY_GAMES, [])
    const storedTags = getStoredArray<string>(STORAGE_KEY_TAGS, [])
    
    setFavoriteGames(storedGames)
    setFavoriteTags(storedTags)
    setGamesInitialized(true)
    setTagsInitialized(true)
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

  return (
    <FavoriteGamesContext.Provider value={gamesContextValue}>
      <FavoriteTagsContext.Provider value={tagsContextValue}>
        {children}
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
