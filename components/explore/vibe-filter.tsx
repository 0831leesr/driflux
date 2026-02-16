"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TagRow } from "@/lib/data"
import { useCallback } from "react"
import { Check } from "lucide-react"
import { TagSearchInput } from "@/components/explore/tag-search-input"

interface VibeFilterProps {
  allTags: TagRow[]
  selectedTags: string[] // Array of tag names
}

export function VibeFilter({ allTags, selectedTags }: VibeFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateUrl = useCallback((tags: string[]) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tags.length > 0) {
      params.set("tags", tags.map(t => encodeURIComponent(t)).join(","))
    } else {
      params.delete("tags")
    }
    router.push(`/explore?${params.toString()}`, { scroll: false })
  }, [searchParams, router])

  const toggleTag = useCallback((tagName: string) => {
    const currentTags = selectedTags.includes(tagName)
      ? selectedTags.filter(t => t !== tagName)
      : [...selectedTags, tagName]
    updateUrl(currentTags)
  }, [selectedTags, updateUrl])

  const addTag = useCallback((tagName: string) => {
    if (!selectedTags.includes(tagName)) {
      updateUrl([...selectedTags, tagName])
    }
  }, [selectedTags, updateUrl])

  return (
    <div className="w-full">
      {/* Header with Search */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Filter by Vibe
          </h2>
          <p className="text-sm text-muted-foreground">
            Select tags to find games that match your mood
          </p>
        </div>
        <TagSearchInput
          onAddTag={addTag}
          selectedTags={selectedTags}
          placeholder="태그 검색..."
        />
      </div>

      {/* Tag Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {allTags.map((tag) => {
          const isSelected = selectedTags.includes(tag.name)

          return (
            <Badge
              key={tag.id}
              variant={isSelected ? "default" : "outline"}
              className={`cursor-pointer select-none gap-1.5 px-4 py-2 text-sm font-medium transition-all hover:scale-105 ${
                isSelected
                  ? "border-2 border-[hsl(var(--neon-purple))] bg-[hsl(var(--neon-purple))] !text-[hsl(var(--primary-foreground))] shadow-md hover:bg-[hsl(var(--neon-purple))]/90 hover:shadow-lg [&_svg]:text-[hsl(var(--primary-foreground))]"
                  : "border border-border bg-card/50 text-muted-foreground hover:border-[hsl(var(--neon-purple))]/40 hover:bg-card hover:text-foreground"
              }`}
              onClick={() => toggleTag(tag.name)}
            >
              {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
              {tag.name}
            </Badge>
          )
        })}
        {/* Custom tags added via search */}
        {selectedTags
          .filter((name) => !allTags.some((t) => t.name === name))
          .map((tagName) => (
            <Badge
              key={tagName}
              variant="default"
              className="cursor-pointer select-none gap-1.5 border-2 border-[hsl(var(--neon-purple))] bg-[hsl(var(--neon-purple))] px-4 py-2 text-sm font-medium !text-[hsl(var(--primary-foreground))] shadow-md transition-all hover:scale-105 hover:bg-[hsl(var(--neon-purple))]/90 hover:shadow-lg [&_svg]:text-[hsl(var(--primary-foreground))]"
              onClick={() => toggleTag(tagName)}
            >
              <Check className="h-3.5 w-3.5 shrink-0" />
              {tagName}
            </Badge>
          ))}
      </div>

      {/* Selected Tags Counter */}
      {selectedTags.length > 0 && (
        <div className="mt-3 flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {selectedTags.length} tag{selectedTags.length > 1 ? "s" : ""} selected
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/explore", { scroll: false })}
            className="h-8 border-border px-3 text-xs"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  )
}
