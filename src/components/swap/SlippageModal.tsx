'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { JAKARTA } from '@/lib/styles'
import { SLIPPAGE_PRESETS } from '@/lib/swap/constants'

interface SlippageModalProps {
  value:    number
  onChange: (v: number) => void
  onClose:  () => void
}

export function SlippageModal({ value, onChange, onClose }: SlippageModalProps) {
  const [custom, setCustom] = useState('')
  const [showCustom, setShowCustom] = useState(!SLIPPAGE_PRESETS.includes(value))

  useEffect(() => {
    if (!SLIPPAGE_PRESETS.includes(value)) {
      setCustom(String(value * 100))
      setShowCustom(true)
    }
  }, [value])

  function applyCustom() {
    const n = parseFloat(custom)
    if (!isNaN(n) && n > 0 && n <= 50) {
      onChange(n / 100)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="font-semibold text-gray-800" style={JAKARTA}>Slippage Tolerance</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
        </div>
        <div className="px-5 pb-5 space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {SLIPPAGE_PRESETS.map(p => (
              <button key={p} onClick={() => { onChange(p); onClose() }}
                className={`py-2 rounded-xl text-sm font-semibold transition-colors ${
                  value === p && !showCustom
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-violet-50 hover:text-violet-600'
                }`}>
                {p * 100}%
              </button>
            ))}
          </div>
          <div>
            <button onClick={() => setShowCustom(!showCustom)}
              className="text-xs text-violet-500 hover:text-violet-700 font-medium">
              {showCustom ? 'Hide custom' : 'Custom value'}
            </button>
            {showCustom && (
              <div className="flex items-center gap-2 mt-2">
                <input type="number" min="0.01" max="50" step="0.1" value={custom}
                  onChange={e => setCustom(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && applyCustom()}
                  placeholder="e.g. 1.5"
                  className="flex-1 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm outline-none focus:border-violet-300" />
                <span className="text-sm text-gray-400 font-medium">%</span>
                <button onClick={applyCustom}
                  className="px-3 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors">
                  Set
                </button>
              </div>
            )}
          </div>
          {value >= 0.05 && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              <AlertTriangle size={12} />
              High slippage may result in an unfavorable rate
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
