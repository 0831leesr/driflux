"use client"

import Image, { type ImageProps } from "next/image"
import { useState, useEffect } from "react"
import { DEFAULT_IMAGES } from "@/lib/utils"

export type GameImageType = keyof typeof DEFAULT_IMAGES

/** 작은 회색 블러용 base64 (로딩 중 체감 개선) */
const BLUR_DATA_URL =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQACEQAD8Acn/9k="

interface GameImageProps extends Omit<ImageProps, "src"> {
  src: string | null | undefined
  type: GameImageType
  priority?: boolean
}

function resolveSrc(url: string | null | undefined, type: GameImageType): string {
  const trimmed = url?.trim()
  if (!trimmed) return DEFAULT_IMAGES[type].local
  if (trimmed.startsWith("//")) return `https:${trimmed}`
  return trimmed
}

export default function GameImage({ src, type, alt, priority, ...props }: GameImageProps) {
  const initialSrc = resolveSrc(src, type)
  const [imgSrc, setImgSrc] = useState(initialSrc)
  const isLocalDefault = initialSrc === DEFAULT_IMAGES[type].local || initialSrc === DEFAULT_IMAGES[type].remote

  useEffect(() => {
    setImgSrc(resolveSrc(src, type))
  }, [src, type])

  const handleError = () => {
    if (imgSrc === DEFAULT_IMAGES[type].local) {
      setImgSrc(DEFAULT_IMAGES[type].remote)
    } else {
      setImgSrc(DEFAULT_IMAGES[type].local)
    }
  }

  return (
    <Image
      {...props}
      src={imgSrc}
      alt={alt}
      priority={priority}
      placeholder={isLocalDefault ? "empty" : "blur"}
      blurDataURL={isLocalDefault ? undefined : BLUR_DATA_URL}
      onError={handleError}
    />
  )
}
