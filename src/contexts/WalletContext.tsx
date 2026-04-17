'use client'

/**
 * WalletContext — thin bridge over wagmi useAccount.
 *
 * Exposes a `stableAddress` that only updates after 150ms of stability.
 * This prevents wagmi's reconnect flicker (address briefly = undefined
 * during page navigation) from causing cascade re-fetches in all components.
 */

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { useAccount, useDisconnect } from 'wagmi'

interface WalletContextValue {
  address:       string | null
  stableAddress: string | null
  isConnected:   boolean
  disconnect:    () => void
}

const WalletContext = createContext<WalletContextValue>({
  address:       null,
  stableAddress: null,
  isConnected:   false,
  disconnect:    () => {},
})

export function useWallet() {
  return useContext(WalletContext)
}

export function WalletContextProvider({ children, disabled }: { children: ReactNode; disabled?: boolean }) {
  const account = useAccount()
  const disconnectHook = useDisconnect()

  const address = disabled ? null : account.address
  const isConnected = disabled ? false : account.isConnected
  const disconnect = disabled ? (() => {}) : disconnectHook.disconnect

  const rawAddress    = (isConnected && address) ? address : null
  const [stable, setStable] = useState<string | null>(rawAddress)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    if (rawAddress) {
      timerRef.current = setTimeout(() => {
        setStable(rawAddress)
      }, 150)
    } else {
      timerRef.current = setTimeout(() => {
        setStable(null)
      }, 500)
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [rawAddress])

  return (
    <WalletContext.Provider value={{
      address:       rawAddress,
      stableAddress: stable,
      isConnected:   !!stable,
      disconnect,
    }}>
      {children}
    </WalletContext.Provider>
  )
}
