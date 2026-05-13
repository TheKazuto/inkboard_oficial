'use client'

import { useEffect, useState } from 'react'

export interface AprEntry {
  protocol: string
  logo: string
  url: string
  tokens: string[]
  label: string
  apr: number
  tvl: number
  type: 'pool' | 'vault' | 'lend'
  isStable: boolean
}

interface State {
  data: AprEntry[] | null
  error: boolean
  loading: boolean
}

/**
 * Fetches /api/best-aprs from the client.
 * Browser HTTP cache (Cache-Control: public, max-age=60 from the route) handles dedup
 * across multiple components on the same page within the same minute.
 */
export function useBestApr(): State & { top: AprEntry | null } {
  const [state, setState] = useState<State>({ data: null, error: false, loading: true })

  useEffect(() => {
    let alive = true
    const ctrl = new AbortController()
    fetch('/api/best-aprs', { signal: ctrl.signal })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((res: AprEntry[] | { data?: AprEntry[] }) => {
        const arr: AprEntry[] = Array.isArray(res)
          ? res
          : Array.isArray(res?.data)
            ? res.data
            : []
        if (!alive) return
        setState({ data: arr, error: false, loading: false })
      })
      .catch((err: unknown) => {
        if (!alive) return
        if (err instanceof DOMException && err.name === 'AbortError') return
        setState(prev => ({ ...prev, error: true, loading: false }))
      })
    return () => {
      alive = false
      ctrl.abort()
    }
  }, [])

  return { ...state, top: state.data?.[0] ?? null }
}
