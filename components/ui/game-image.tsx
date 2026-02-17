"use client"

import Image, { type ImageProps } from "next/image"
import { useState, useEffect } from "react"
import { DEFAULT_IMAGES } from "@/lib/utils"

export type GameImageType = keyof typeof DEFAULT_IMAGES

interface GameImageProps extends Omit<ImageProps, "src"> {
  src: string | null | undefined
  type: GameImageType
}

function resolveSrc(url: string | null | undefined, type: GameImageType): string {
  const trimmed = url?.trim()
  if (!trimmed) return DEFAULT_IMAGES[type].local
  if (trimmed.startsWith("//")) return `https:${trimmed}`
  return trimmed
}

export default function GameImage({ src, type, alt, ...props }: GameImageProps) {
  const initialSrc = resolveSrc(src, type)
  const [imgSrc, setImgSrc] = useState(initialSrc)

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
      onError={handleError}
    />
  )
}
