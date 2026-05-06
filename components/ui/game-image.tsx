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

  // priority 이미지(첫 번째 행)는 Next.js 최적화 활성화: 안정적인 Steam URL은 30일 캐시로 변환 재사용.
  // 나머지는 Vercel Hobby 플랜 변환 한도(1,000/월) 절약을 위해 unoptimized 유지.
  const unoptimized = !priority || isLocalDefault

  return (
    <Image
      {...props}
      src={imgSrc}
      alt={alt}
      priority={priority}
      placeholder={isLocalDefault ? "empty" : "blur"}
      blurDataURL={isLocalDefault ? undefined : BLUR_DATA_URL}
      unoptimized={unoptimized}
      onError={handleError}
    />
  )
}
