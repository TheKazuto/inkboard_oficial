'use client'

import { ReactNode, useState } from 'react'
import { WagmiProvider } from 'wagmi'
import { defineChain } from 'viem'
import { RainbowKitProvider, getDefaultConfig, lightTheme } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WalletContextProvider } from '@/contexts/WalletContext'
import { PortfolioProvider }     from '@/contexts/PortfolioContext'
import { TransactionProvider }   from '@/contexts/TransactionContext'
import { PreferencesProvider }   from '@/contexts/PreferencesContext'

import '@rainbow-me/rainbowkit/styles.css'

export const inkMainnet = defineChain({
  id: 57073,
  name: 'Ink',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc-gel.inkonchain.com'] },
  },
  blockExplorers: {
    default: { name: 'Ink Explorer', url: 'https://explorer.inkonchain.com' },
  },
})

const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

// Fail gracefully when WalletConnect Project ID is not configured
// instead of sending a bogus value to WalletConnect infrastructure
if (!wcProjectId) {
  console.error('[InkBoard] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. Wallet connections will be disabled.')
}

const wagmiConfig = wcProjectId
  ? getDefaultConfig({
      appName:   'InkBoard',
      projectId: wcProjectId,
      chains:    [inkMainnet],
      ssr:       false,
    })
  : null

export function WalletProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
  }))

  if (!wagmiConfig) {
    // WalletConnect not configured — render without wallet features
    return (
      <QueryClientProvider client={queryClient}>
        <PreferencesProvider>
          <WalletContextProvider disabled>
            <PortfolioProvider>
              <TransactionProvider>
                {children}
              </TransactionProvider>
            </PortfolioProvider>
          </WalletContextProvider>
        </PreferencesProvider>
      </QueryClientProvider>
    )
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={lightTheme({
            accentColor: '#7C3AED',
            accentColorForeground: 'white',
            borderRadius: 'large',
            fontStack: 'system',
          })}
          locale="en-US"
        >
          <PreferencesProvider>
            <WalletContextProvider>
              <PortfolioProvider>
                <TransactionProvider>
                  {children}
                </TransactionProvider>
              </PortfolioProvider>
            </WalletContextProvider>
          </PreferencesProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
