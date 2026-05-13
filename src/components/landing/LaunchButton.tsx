'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'

interface LaunchButtonProps {
  className?: string
  children: ReactNode
  ariaLabel?: string
}

const ANIMATION_MS = 520
const NAVIGATE_AT_MS = ANIMATION_MS - 80 // Navigate just before wash fully covers

export default function LaunchButton({
  className,
  children,
  ariaLabel,
}: LaunchButtonProps) {
  const router = useRouter()
  const [launching, setLaunching] = useState(false)
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      // Ignore double-clicks while wash is running
      if (launching) {
        e.preventDefault()
        return
      }

      // Modifier keys: let the browser handle (new tab, save, etc.)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
        return
      }

      // Reduced motion: navigate immediately, skip the wash
      if (
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ) {
        return
      }

      e.preventDefault()
      const target = e.currentTarget
      const rect = target.getBoundingClientRect()
      const x = ((rect.left + rect.width / 2) / window.innerWidth) * 100
      const y = ((rect.top + rect.height / 2) / window.innerHeight) * 100
      setOrigin({ x, y })
      setLaunching(true)
      timeoutRef.current = window.setTimeout(() => {
        router.push('/dashboard')
      }, NAVIGATE_AT_MS)
    },
    [launching, router]
  )

  const style: CSSProperties | undefined =
    origin != null
      ? ({
          ['--lp-ink-x' as string]: `${origin.x}%`,
          ['--lp-ink-y' as string]: `${origin.y}%`,
        } as CSSProperties)
      : undefined

  return (
    <Link
      href="/dashboard"
      className={`${className ?? ''}${launching ? ' lp-launching' : ''}`}
      aria-label={ariaLabel ?? 'Launch dashboard'}
      onClick={handleClick}
      style={style}
    >
      {children}
    </Link>
  )
}
