import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { fetchStreamsByTopTag } from "@/lib/data"
import { TagDetailsPage } from "@/components/tag-details-page"

interface PageProps {
  params: Promise<{ tag: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tag } = await params
  // Decode URL-encoded tag name
  const tagName = decodeURIComponent(tag)

  return {
    title: `#${tagName} - Live Streams | Driflux`,
    description: `Watch ${tagName} games live on Driflux. Find the best ${tagName} live streams and streamers.`,
  }
}

export default async function TagPage({ params }: PageProps) {
  const { tag } = await params
  // Decode URL-encoded tag name
  const tagName = decodeURIComponent(tag)

  // Fetch streams using top_tags
  const streams = await fetchStreamsByTopTag(tagName)

  // If no streams found, still show the page (might be a valid tag with no live streams)
  // Don't use notFound() as the tag might exist in top_tags but have no live streams

  return <TagDetailsPage tagName={tagName} streams={streams} />
}
