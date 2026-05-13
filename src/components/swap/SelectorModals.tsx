'use client'

import { useState, useEffect } from 'react'
import { Loader, Search, X } from 'lucide-react'
import { JAKARTA } from '@/lib/styles'
import type { LifiChain, LifiToken } from '@/lib/swap/types'
import { loadTokensForChain } from '@/lib/swap/api'
import { ChainImage, TokenImage } from './Images'

interface ChainModalProps {
  chains:   LifiChain[]
  onSelect: (c: LifiChain) => void
  onClose:  () => void
}

export function ChainModal({ chains, onSelect, onClose }: ChainModalProps) {
  const [q, setQ] = useState('')
  const filtered = chains.filter(c =>
    c.name.toLowerCase().includes(q.toLowerCase()) ||
    c.key.toLowerCase().includes(q.toLowerCase()),
  )
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="font-semibold text-gray-800" style={JAKARTA}>Select Network</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
        </div>
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
            <Search size={14} className="text-gray-400" />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search network…"
              className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400" />
          </div>
        </div>
        <div className="overflow-y-auto max-h-72 px-3 pb-4">
          {filtered.map(c => (
            <button key={c.id} onClick={() => { onSelect(c); onClose() }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-violet-50 transition-colors text-left">
              <ChainImage chain={c} size={32} />
              <div>
                <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                <p className="text-xs text-gray-400">{c.chainType}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

interface TokenModalProps {
  chain:    LifiChain
  onSelect: (t: LifiToken) => void
  onClose:  () => void
}

export function TokenModal({ chain, onSelect, onClose }: TokenModalProps) {
  const [q, setQ] = useState('')
  const [tokens, setTokens] = useState<LifiToken[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadTokensForChain(chain.id).then(t => {
      if (!cancelled) { setTokens(t); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [chain.id])

  const filtered = tokens.filter(t =>
    t.symbol.toLowerCase().includes(q.toLowerCase()) ||
    t.name.toLowerCase().includes(q.toLowerCase()) ||
    t.address.toLowerCase() === q.toLowerCase(),
  ).slice(0, 80)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h3 className="font-semibold text-gray-800" style={JAKARTA}>Select Token</h3>
            <p className="text-xs text-gray-400">{chain.name}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
        </div>
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100">
            <Search size={14} className="text-gray-400" />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search by name, symbol or address…"
              className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400" />
          </div>
        </div>
        <div className="overflow-y-auto max-h-72 px-3 pb-4">
          {loading && (
            <div className="flex items-center justify-center py-8 gap-2 text-gray-400 text-sm">
              <Loader size={14} className="animate-spin" /> Loading tokens…
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">No tokens found</p>
          )}
          {!loading && filtered.map(token => (
            <button key={token.address} onClick={() => { onSelect(token); onClose() }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-violet-50 transition-colors text-left">
              <TokenImage token={token} size={36} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800">{token.symbol}</p>
                <p className="text-xs text-gray-400 truncate">{token.name}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
