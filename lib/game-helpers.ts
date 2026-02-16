/**
 * Convert game title to URL-friendly slug
 */
export function getGameSlug(title: string): string | null {
  const slugifiedTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slugifiedTitle || null
}

/**
 * Convert genre name to URL-friendly slug
 */
export function getGenreSlug(name: string): string | null {
  const slugifiedName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slugifiedName || null
}

/**
 * Convert tag name to URL-friendly slug
 */
export function getTagSlug(tagName: string): string {
  return tagName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}

/**
 * Convert slug back to tag name for display
 */
export function getTagNameFromSlug(slug: string): string {
  // Common tag names mapping
  const TAG_SLUG_TO_NAME: Record<string, string> = {
    "horror": "Horror",
    "co-op": "Co-op",
    "soulslike": "Soulslike",
    "indie": "Indie",
    "rpg": "RPG",
    "open-world": "Open World",
    "fps": "FPS",
    "roguelike": "Roguelike",
    "action": "Action",
    "strategy": "Strategy",
    "simulation": "Simulation",
    "action-rpg": "Action RPG",
    "adventure": "Adventure",
  }

  return TAG_SLUG_TO_NAME[slug.toLowerCase()] ?? slug
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}
