"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { searchTagsFromGames } from "@/lib/data"

interface TagSearchInputProps {
  onAddTag: (tagName: string) => void
  selectedTags: string[]
  placeholder?: string
}

export function TagSearchInput({ onAddTag, selectedTags, placeholder = "태그 검색..." }: TagSearchInputProps) {
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSuggestions([])
      return
    }
    setIsSearching(true)
    try {
      const results = await searchTagsFromGames(q, 8)
      setSuggestions(results.filter((tag) => !selectedTags.includes(tag)))
    } catch {
      setSuggestions([])
    } finally {
      setIsSearching(false)
    }
  }, [selectedTags])

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query)
    }, 200)
    return () => clearTimeout(timer)
  }, [query, performSearch])

  const handleSelect = (tagName: string) => {
    if (!selectedTags.includes(tagName)) {
      onAddTag(tagName)
    }
    setQuery("")
    setSuggestions([])
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      if (query.trim()) {
        handleSelect(query.trim())
      }
    } else if (e.key === "Escape") {
      setIsOpen(false)
      setQuery("")
    }
  }

  const handleBlur = () => {
    setTimeout(() => setIsOpen(false), 150)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-8 w-44 pl-8 pr-2 text-sm"
        />
      </div>

      {isOpen && (query.trim() || suggestions.length > 0) && (
        <div
          className="absolute top-full left-0 z-50 mt-1 max-h-48 w-56 overflow-auto rounded-md border border-border bg-popover py-1 shadow-md"
          onMouseDown={(e) => e.preventDefault()}
        >
          {isSearching ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">검색 중...</div>
          ) : suggestions.length > 0 ? (
            suggestions.map((tag) => (
              <button
                key={tag}
                type="button"
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                onMouseDown={() => handleSelect(tag)}
              >
                {tag}
              </button>
            ))
          ) : query.trim() ? (
            <button
              type="button"
              className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              onMouseDown={() => handleSelect(query.trim())}
            >
              "{query.trim()}" 추가
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
