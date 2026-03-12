'use client'

import Lottie from 'lottie-react'
import { type LottieAnimationKey, LOTTIE_ANIMATIONS } from '@/lib/lottie-animations'
import { useEffect, useState } from 'react'

interface LottieAnimationProps {
  animation: LottieAnimationKey
  className?: string
  loop?: boolean
  autoplay?: boolean
  style?: React.CSSProperties
}

export default function LottieAnimation({
  animation,
  className,
  loop = true,
  autoplay = true,
  style,
}: LottieAnimationProps) {
  const [animationData, setAnimationData] = useState<object | null>(null)
  const [error, setError] = useState(false)

  const path = LOTTIE_ANIMATIONS[animation]

  useEffect(() => {
    if (!path) {
      setError(true)
      return
    }
    fetch(path)
      .then((res) => res.json())
      .then((data) => setAnimationData(data))
      .catch(() => setError(true))
  }, [path])

  if (error || !animationData) return null

  return (
    <Lottie
      animationData={animationData}
      loop={loop}
      autoplay={autoplay}
      className={className}
      style={style}
    />
  )
}
