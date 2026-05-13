'use client'

import { useState } from 'react'
import type { LifiChain, LifiToken } from '@/lib/swap/types'
import { NATIVE, OVERRIDE_LOGOS } from '@/lib/swap/constants'

interface FallbackImageProps {
  urls:   string[]
  symbol: string
  size:   number
}

export function FallbackImage({ urls, symbol, size }: FallbackImageProps) {
  const [idx, setIdx] = useState(0)
  const avatar = (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold shrink-0"
      style={{
        width: size, height: size,
        background: `hsl(${((([...symbol].reduce((h, c) => c.charCodeAt(0) + ((h << 5) - h), 0)) % 360) + 360) % 360}, 60%, 50%)`,
        fontSize: size * 0.38,
      }}
    >
      {symbol.slice(0, 2).toUpperCase()}
    </div>
  )
  if (idx >= urls.length || !urls[idx]) return avatar
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={urls[idx]} alt={symbol} width={size} height={size}
      className="rounded-full object-cover shrink-0"
      style={{ width: size, height: size }}
      onError={() => setIdx(i => i + 1)}
    />
  )
}

export function TokenImage({ token, size = 28 }: { token: LifiToken; size?: number }) {
  const sym = token.symbol.toUpperCase()
  const urls: string[] = []
  if (OVERRIDE_LOGOS[sym]) urls.push(OVERRIDE_LOGOS[sym])
  if (token.logoURI) urls.push(token.logoURI)
  if (token.address !== NATIVE && token.address?.length === 42) {
    urls.push(`https://tokens.1inch.io/${token.address.toLowerCase()}.png`)
  }
  return (
    <FallbackImage
      key={token.address + (token.chainId ?? '')}
      urls={[...new Set(urls)]}
      symbol={token.symbol}
      size={size}
    />
  )
}

export function ChainImage({ chain, size = 28 }: { chain: LifiChain; size?: number }) {
  const urls: string[] = []
  if (chain.logoURI) urls.push(chain.logoURI)
  urls.push(`https://icons.llamao.fi/icons/chains/rsz_${chain.key}.jpg`)
  return <FallbackImage key={String(chain.id)} urls={urls} symbol={chain.name} size={size} />
}
