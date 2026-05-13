'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  ArrowLeftRight, ChevronDown, RefreshCw, Info,
  CheckCircle, XCircle, Loader, ExternalLink,
  Settings, AlertTriangle,
} from 'lucide-react'
import { useWallet } from '@/contexts/WalletContext'
import { useSendTransaction, useWaitForTransactionReceipt, useChainId, useSwitchChain } from 'wagmi'
import { encodeFunctionData } from 'viem'
import { JAKARTA } from '@/lib/styles'
import type { LifiChain, LifiToken, LifiQuote, TxStatus } from '@/lib/swap/types'
import {
  NATIVE, GAS_BUFFER, ERC20_APPROVE_ABI,
  QUOTE_EXPIRY, QUOTE_AUTO_REFRESH,
  SLIPPAGE_CROSS_DEFAULT, SLIPPAGE_ONCHAIN_DEFAULT,
  INK_NATIVE, USDC_INK, INK_CHAIN,
} from '@/lib/swap/constants'
import { humanToWei, weiToHuman } from '@/lib/swap/format'
import { loadChains, fetchQuote, fetchStatus, getRpcUrl } from '@/lib/swap/api'
import { TokenImage, ChainImage } from '@/components/swap/Images'
import { SlippageModal } from '@/components/swap/SlippageModal'
import { ChainModal, TokenModal } from '@/components/swap/SelectorModals'

const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/

export default function SwapPage() {
  const { address, isConnected } = useWallet()
  const connectedChainId = useChainId()
  const { switchChain } = useSwitchChain()

  const [chains, setChains]       = useState<LifiChain[]>([])
  const [fromChain, setFromChain] = useState<LifiChain>(INK_CHAIN)
  const [toChain, setToChain]     = useState<LifiChain>(INK_CHAIN)
  const [fromToken, setFromToken] = useState<LifiToken>(INK_NATIVE)
  const [toToken, setToToken]     = useState<LifiToken>(USDC_INK)
  const [amount, setAmount]       = useState('')
  const [receiver, setReceiver]   = useState('')

  const [quote, setQuote]               = useState<LifiQuote | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError]     = useState<string | null>(null)

  const [txStatus, setTxStatus] = useState<TxStatus>('idle')
  const [txHash, setTxHash]     = useState<string | null>(null)
  const [txError, setTxError]   = useState<string | null>(null)

  // Track approval hash for waitForTransactionReceipt
  const [approvalHash, setApprovalHash] = useState<`0x${string}` | undefined>(undefined)

  const [modal, setModal]                 = useState<'fromToken' | 'toToken' | 'fromChain' | 'toChain' | 'slippage' | null>(null)
  const [quoteAge, setQuoteAge]           = useState(0)
  const [receiverError, setReceiverError] = useState<string | null>(null)

  const isCrossChain = fromChain.id !== toChain.id
  const [slippageOnChain, setSlippageOnChain] = useState(SLIPPAGE_ONCHAIN_DEFAULT)
  const [slippageCross, setSlippageCross]     = useState(SLIPPAGE_CROSS_DEFAULT)
  const activeSlippage    = isCrossChain ? slippageCross    : slippageOnChain
  const setActiveSlippage = isCrossChain ? setSlippageCross : setSlippageOnChain

  const validateReceiver = useCallback((val: string): boolean => {
    if (!val.trim()) return true
    const valid = EVM_ADDRESS_RE.test(val.trim())
    setReceiverError(valid ? null : 'Invalid address format')
    return valid
  }, [])

  const quoteAgeRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollCleanupRef = useRef<(() => void) | null>(null)

  // ── Balance via RPC ───────────────────────────────────────────────────────
  const [fromBalanceRaw, setFromBalanceRaw] = useState<string | null>(null)
  const [balanceError, setBalanceError]     = useState(false)
  const fromDecimals = fromToken.decimals ?? 18

  useEffect(() => {
    setFromBalanceRaw(null)
    setBalanceError(false)
    if (!address || !isConnected) return
    const rpc = getRpcUrl(fromChain)
    if (!rpc) { setBalanceError(true); return }
    const controller = new AbortController()
    const isNative = fromToken.address === NATIVE

    async function fetchBal() {
      try {
        let raw: bigint
        if (isNative) {
          const res = await fetch(rpc!, {
            method: 'POST', signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [address, 'latest'] }),
          })
          const d = await res.json()
          raw = BigInt(d.result ?? '0x0')
        } else {
          const padded = address!.replace('0x', '').padStart(64, '0')
          const res = await fetch(rpc!, {
            method: 'POST', signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0', id: 1, method: 'eth_call',
              params: [{ to: fromToken.address, data: '0x70a08231' + padded }, 'latest'],
            }),
          })
          const d = await res.json()
          raw = BigInt(d.result && d.result !== '0x' ? d.result : '0x0')
        }
        setFromBalanceRaw(raw.toString())
      } catch {
        if (!controller.signal.aborted) setBalanceError(true)
      }
    }
    fetchBal()
    return () => controller.abort()
  }, [address, isConnected, fromChain, fromToken.address, fromToken.decimals])

  const fromBalanceHuman = fromBalanceRaw !== null ? weiToHuman(fromBalanceRaw, fromDecimals) : null

  const fromBalanceDisplay = useMemo(() => {
    if (fromBalanceHuman === null) return null
    const num = parseFloat(fromBalanceHuman)
    if (num === 0) return '0'
    if (num < 0.0001) return '<0.0001'
    return num.toLocaleString('en-US', { maximumFractionDigits: 6 })
  }, [fromBalanceHuman])

  const insufficientBalance = useMemo(() => {
    if (!amount || !fromBalanceRaw || fromBalanceRaw === '0') return false
    try {
      const amountWei = humanToWei(amount, fromDecimals)
      const balanceWei = BigInt(fromBalanceRaw)
      return amountWei > balanceWei
    } catch { return false }
  }, [amount, fromBalanceRaw, fromDecimals])

  const isSameToken = useMemo(() => {
    return fromChain.id === toChain.id &&
      fromToken.address.toLowerCase() === toToken.address.toLowerCase()
  }, [fromChain.id, toChain.id, fromToken.address, toToken.address])

  function handleMax() {
    if (fromBalanceRaw === null || fromBalanceRaw === '0') return
    const isNative = fromToken.address === NATIVE
    const bufferHuman = isNative ? (GAS_BUFFER[fromChain.id] ?? 0.002) : 0

    if (bufferHuman === 0) {
      setAmount(fromBalanceHuman!)
      return
    }

    const bufferWei = BigInt(Math.floor(bufferHuman * Math.pow(10, fromDecimals)))
    const rawBig = BigInt(fromBalanceRaw)
    const maxWei = rawBig > bufferWei ? rawBig - bufferWei : 0n
    if (maxWei === 0n) { setAmount(''); return }

    setAmount(weiToHuman(maxWei.toString(), fromDecimals))
  }

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { sendTransactionAsync } = useSendTransaction()

  // Wait for approval receipt
  const { isSuccess: approvalConfirmed } = useWaitForTransactionReceipt({ hash: approvalHash })
  void approvalConfirmed

  useEffect(() => {
    const ac = new AbortController()
    loadChains().then(c => { if (!ac.signal.aborted) setChains(c) })
    return () => ac.abort()
  }, [])
  useEffect(() => () => { pollCleanupRef.current?.() }, [])

  // Quote age ticker
  useEffect(() => {
    if (quote) {
      setQuoteAge(0)
      quoteAgeRef.current = setInterval(() => setQuoteAge(a => a + 1), 1000)
    } else {
      if (quoteAgeRef.current) clearInterval(quoteAgeRef.current)
      setQuoteAge(0)
    }
    return () => { if (quoteAgeRef.current) clearInterval(quoteAgeRef.current) }
  }, [quote])

  const quoteExpired = quoteAge >= QUOTE_EXPIRY

  // Quote with debounce
  const getQuote = useCallback(async (amt: string) => {
    if (!amt || isNaN(Number(amt)) || Number(amt) <= 0 || !address) { setQuote(null); return }
    if (fromChain.id === toChain.id &&
        fromToken.address.toLowerCase() === toToken.address.toLowerCase()) {
      setQuoteError('Select a different token')
      setQuote(null)
      return
    }
    setQuoteLoading(true); setQuoteError(null)
    try {
      const recv = receiver.trim() || undefined
      setQuote(await fetchQuote(fromChain, fromToken, amt, toChain, toToken, address, activeSlippage, recv))
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setQuoteError(msg.includes('No available') || msg.includes('not found')
        ? 'No route found for this pair' : (msg || 'No route found'))
      setQuote(null)
    } finally { setQuoteLoading(false) }
  }, [fromChain, fromToken, toChain, toToken, address, receiver, activeSlippage])

  // Auto-refresh quote before expiry
  const autoRefreshRef = useRef(false)
  useEffect(() => {
    if (quoteAge === QUOTE_AUTO_REFRESH && quote && txStatus === 'idle' && amount && !autoRefreshRef.current) {
      autoRefreshRef.current = true
      getQuote(amount)
    }
    if (quoteAge < QUOTE_AUTO_REFRESH) {
      autoRefreshRef.current = false
    }
  }, [quoteAge, quote, txStatus, amount, getQuote])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => getQuote(amount), 700)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [amount, getQuote])

  function flipDirection() {
    setFromChain(toChain); setToChain(fromChain)
    setFromToken(toToken); setToToken(fromToken)
    setAmount(''); setQuote(null)
  }

  // ── Execute Swap ──────────────────────────────────────────────────────────
  async function executeSwap() {
    if (!address || !quote || !amount || quoteExpired || !quote.transactionRequest) return
    if (insufficientBalance) return
    if (isSameToken) return
    if (receiver.trim() && !validateReceiver(receiver)) return
    setTxStatus('idle'); setTxError(null); setApprovalHash(undefined)

    try {
      const txReq = quote.transactionRequest

      if (quote.estimate.approvalAddress && fromToken.address !== NATIVE) {
        const approvalAddr = quote.estimate.approvalAddress
        if (!EVM_ADDRESS_RE.test(approvalAddr)) {
          throw new Error('Invalid approval address received from quote')
        }
        setTxStatus('approving')
        const approveAmount = humanToWei(amount, fromToken.decimals)
        // 0.5% buffer to cover rounding
        const approveWithBuffer = approveAmount + (approveAmount / 200n)
        const appHash = await sendTransactionAsync({
          to: fromToken.address as `0x${string}`,
          data: encodeFunctionData({
            abi: ERC20_APPROVE_ABI, functionName: 'approve',
            args: [approvalAddr as `0x${string}`, approveWithBuffer],
          }),
        })
        setApprovalHash(appHash)
        setTxStatus('waitingApproval')

        // Poll for approval confirmation via RPC
        const rpc = getRpcUrl(fromChain)
        if (rpc) {
          let confirmed = false
          for (let attempt = 0; attempt < 60 && !confirmed; attempt++) {
            await new Promise(r => setTimeout(r, 2000))
            try {
              const res = await fetch(rpc, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  jsonrpc: '2.0', id: 1, method: 'eth_getTransactionReceipt',
                  params: [appHash],
                }),
                signal: AbortSignal.timeout(5000),
              })
              const data = await res.json()
              if (data?.result?.status === '0x1') {
                confirmed = true
              } else if (data?.result?.status === '0x0') {
                throw new Error('Approval transaction reverted')
              }
            } catch (e) {
              if (e instanceof Error && e.message.includes('reverted')) throw e
            }
          }
          if (!confirmed) throw new Error('Approval confirmation timed out')
        } else {
          await new Promise(r => setTimeout(r, 8000))
        }
      }

      setTxStatus('swapping')
      if (!txReq.to || !EVM_ADDRESS_RE.test(txReq.to)) {
        throw new Error('Invalid transaction target address from quote')
      }
      const hash = await sendTransactionAsync({
        to:    txReq.to as `0x${string}`,
        data:  txReq.data as `0x${string}`,
        value: txReq.value ? BigInt(txReq.value) : 0n,
      })

      setTxHash(hash)
      setTxStatus('pending')

      if (fromChain.id !== toChain.id) {
        let attempts = 0
        let pollTimer: ReturnType<typeof setTimeout> | null = null
        let cancelled = false
        const stopPoll = () => { cancelled = true; if (pollTimer) clearTimeout(pollTimer) }
        pollCleanupRef.current = stopPoll
        const poll = async () => {
          if (cancelled) return
          try {
            const s = await fetchStatus(quote.tool, fromChain.id, toChain.id, hash)
            if (s.status === 'DONE')   { setTxStatus('success'); return }
            if (s.status === 'FAILED') { setTxStatus('error'); setTxError('Transaction failed on destination chain'); return }
          } catch { /* retry */ }
          if (!cancelled && attempts++ < 60) pollTimer = setTimeout(poll, 5000)
        }
        poll()
      } else {
        setTxStatus('success')
      }
    } catch (e) {
      const err = e as { shortMessage?: string; message?: string }
      setTxError(err.shortMessage ?? err.message ?? 'Transaction failed')
      setTxStatus('error')
    }
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const dstAmount = useMemo(() => {
    if (!quote) return ''
    try {
      const big = BigInt(quote.estimate.toAmount)
      const dec = toToken.decimals ?? 18
      const weiStr = big.toString()
      const padded = weiStr.padStart(dec + 1, '0')
      const intPart = padded.slice(0, padded.length - dec) || '0'
      const fracPart = padded.slice(padded.length - dec).slice(0, 6).replace(/0+$/, '')
      const display = fracPart ? `${intPart}.${fracPart}` : intPart
      const human = parseFloat(display)
      if (human >= 1000)  return human.toLocaleString('en-US', { maximumFractionDigits: 2 })
      if (human >= 1)     return human.toFixed(4)
      if (human >= 0.001) return human.toFixed(6)
      if (human > 0)      return human.toExponential(4)
      return '0'
    } catch { return '0' }
  }, [quote, toToken.decimals])

  const dstAmountUsd = quote?.estimate.toAmountUSD
    ? `$${parseFloat(quote.estimate.toAmountUSD).toFixed(2)}` : null

  const wrongChain = isConnected && connectedChainId !== fromChain.id

  const canSwap = isConnected && !!quote && !quoteExpired && !!amount
    && txStatus === 'idle' && !wrongChain && !insufficientBalance && !isSameToken

  const explorerTxUrl = useMemo(() => {
    if (!txHash) return null
    const base = fromChain.metamask?.blockExplorerUrls?.[0]
    return base ? `${base.replace(/\/$/, '')}/tx/${txHash}` : `https://explorer.inkonchain.com/tx/${txHash}`
  }, [fromChain, txHash])

  const routeDisplay = quote?.toolDetails?.name ?? quote?.tool ?? '—'

  const totalFeesUsd = useMemo(() => {
    if (!quote) return null
    let total = 0
    for (const gc of quote.estimate.gasCosts ?? []) total += parseFloat(gc.amountUSD || '0')
    for (const fc of quote.estimate.feeCosts ?? []) total += parseFloat(fc.amountUSD || '0')
    return total > 0 ? total.toFixed(2) : null
  }, [quote])

  const estimatedTime = useMemo(() => {
    if (!quote?.estimate.executionDuration) return null
    const secs = quote.estimate.executionDuration
    if (!isCrossChain && secs < 60) return `${Math.max(2, secs)}s`
    return `~${Math.max(1, Math.round(secs / 60))} min`
  }, [quote, isCrossChain])

  const exchangeRate = useMemo(() => {
    if (!quote || !amount) return null
    try {
      const fromAmt = parseFloat(amount)
      const toAmt = parseFloat(dstAmount.replace(/,/g, ''))
      if (isNaN(fromAmt) || isNaN(toAmt) || fromAmt <= 0) return null
      const rate = toAmt / fromAmt
      const fmtRate = rate >= 1000 ? rate.toLocaleString('en-US', { maximumFractionDigits: 2 })
        : rate >= 1 ? rate.toFixed(4) : rate.toFixed(6)
      return `1 ${fromToken.symbol} ≈ ${fmtRate} ${toToken.symbol}`
    } catch { return null }
  }, [quote, amount, dstAmount, fromToken.symbol, toToken.symbol])

  const priceImpact = useMemo(() => {
    if (!quote?.estimate.fromAmountUSD || !quote?.estimate.toAmountUSD) return null
    const fromUsd = parseFloat(quote.estimate.fromAmountUSD)
    const toUsd   = parseFloat(quote.estimate.toAmountUSD)
    if (fromUsd <= 0) return null
    return ((toUsd - fromUsd) / fromUsd) * 100
  }, [quote])

  const priceImpactSeverity = priceImpact !== null
    ? (priceImpact <= -5 ? 'high' : priceImpact <= -2 ? 'medium' : 'low')
    : 'low'

  const ctaLabel = useMemo(() => {
    if (txStatus === 'approving')       return <><Loader size={16} className="animate-spin" /> Approving…</>
    if (txStatus === 'waitingApproval') return <><Loader size={16} className="animate-spin" /> Waiting for approval…</>
    if (txStatus === 'swapping')        return <><Loader size={16} className="animate-spin" /> Sending…</>
    if (txStatus === 'pending')         return <><Loader size={16} className="animate-spin" /> Confirming…</>
    if (quoteLoading)                   return 'Finding best route…'
    if (!amount)                        return 'Enter an amount'
    if (isSameToken)                    return 'Select a different token'
    if (insufficientBalance)            return 'Insufficient balance'
    if (!quote)                         return 'No route found'
    if (quoteExpired)                   return 'Quote expired — refresh'
    return 'Swap'
  }, [txStatus, quoteLoading, amount, isSameToken, insufficientBalance, quote, quoteExpired])

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-200">
            <ArrowLeftRight size={17} className="text-white" />
          </div>
          <h1 className="font-bold text-2xl text-gray-900" style={JAKARTA}>Cross-chain Swap</h1>
        </div>
        <p className="text-sm text-gray-500 ml-12">
          Cross-chain swaps across {chains.length > 0 ? `${chains.length}+` : '40+'} chains · Best rate via LI.FI aggregation
        </p>
      </div>

      <div className="card p-5 space-y-3">
        <div className="flex justify-end">
          <button onClick={() => setModal('slippage')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100 hover:border-violet-300 hover:bg-violet-50 transition-colors text-xs font-medium text-gray-500 hover:text-violet-600">
            <Settings size={12} />
            Slippage: {activeSlippage * 100}%
          </button>
        </div>

        {/* FROM */}
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">From</span>
            <button onClick={() => setModal('fromChain')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-gray-200 hover:border-violet-300 hover:bg-violet-50 transition-colors text-xs font-medium text-gray-700">
              <ChainImage chain={fromChain} size={16} />
              {fromChain.name}
              <ChevronDown size={11} className="text-gray-400" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setModal('fromToken')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 hover:border-violet-300 hover:bg-violet-50 transition-colors shrink-0">
              <TokenImage token={fromToken} size={24} />
              <span className="font-semibold text-gray-800 text-sm">{fromToken.symbol}</span>
              <ChevronDown size={13} className="text-gray-400" />
            </button>
            <div className="flex-1 flex flex-col items-end gap-1 min-w-0">
              <input type="number" min="0" placeholder="0.00" value={amount}
                onChange={e => { const v = e.target.value; if (v === '' || Number(v) >= 0) setAmount(v) }}
                className={`w-full bg-transparent text-right text-2xl font-semibold outline-none placeholder-gray-300 ${insufficientBalance ? 'text-red-500' : 'text-gray-800'}`} />
              {isConnected && (
                <div className="flex items-center gap-1.5">
                  {balanceError ? (
                    <span className="text-xs text-amber-500">Balance unavailable</span>
                  ) : fromBalanceDisplay !== null ? (
                    <>
                      <span className="text-xs text-gray-400">
                        Balance: <span className={`font-medium ${insufficientBalance ? 'text-red-500' : 'text-gray-500'}`}>
                          {fromBalanceDisplay} {fromToken.symbol}
                        </span>
                      </span>
                      <button onClick={handleMax}
                        className="text-xs font-semibold text-violet-500 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-1.5 py-0.5 rounded transition-colors">
                        MAX
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-gray-300">Loading balance…</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Flip */}
        <div className="flex justify-center -my-1">
          <button onClick={flipDirection}
            className="w-9 h-9 rounded-xl bg-white border border-gray-200 hover:border-violet-300 hover:bg-violet-50 flex items-center justify-center transition-all hover:rotate-180 duration-300 shadow-sm">
            <ArrowLeftRight size={15} className="text-violet-500" />
          </button>
        </div>

        {/* TO */}
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">To</span>
            <button onClick={() => setModal('toChain')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-gray-200 hover:border-violet-300 hover:bg-violet-50 transition-colors text-xs font-medium text-gray-700">
              <ChainImage chain={toChain} size={16} />
              {toChain.name}
              <ChevronDown size={11} className="text-gray-400" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setModal('toToken')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 hover:border-violet-300 hover:bg-violet-50 transition-colors shrink-0">
              <TokenImage token={toToken} size={24} />
              <span className="font-semibold text-gray-800 text-sm">{toToken.symbol}</span>
              <ChevronDown size={13} className="text-gray-400" />
            </button>
            <div className="flex-1 text-right">
              {quoteLoading ? (
                <div className="flex items-center justify-end gap-1.5 text-gray-400">
                  <RefreshCw size={13} className="animate-spin" />
                  <span className="text-sm">Finding route…</span>
                </div>
              ) : dstAmount ? (
                <>
                  <span className="text-2xl font-semibold text-gray-800">{dstAmount}</span>
                  {dstAmountUsd && <p className="text-xs text-gray-400 mt-0.5">≈ {dstAmountUsd}</p>}
                </>
              ) : (
                <span className="text-2xl font-semibold text-gray-300">0.00</span>
              )}
            </div>
          </div>
        </div>

        {isSameToken && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-600">
            <AlertTriangle size={14} /> Select a different destination token
          </div>
        )}

        {isCrossChain && (
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide block mb-1.5">
              Receiver <span className="normal-case text-gray-300">(optional, defaults to your wallet)</span>
            </label>
            <input type="text" value={receiver}
              onChange={e => { setReceiver(e.target.value); setReceiverError(null) }}
              onBlur={e => { if (e.target.value.trim()) validateReceiver(e.target.value) }}
              placeholder={address ?? '0x…'}
              className={`w-full bg-transparent text-sm outline-none placeholder-gray-300 font-mono ${receiverError ? 'text-red-500' : 'text-gray-700'}`} />
            {receiverError && <p className="text-xs text-red-400 mt-1">{receiverError}</p>}
          </div>
        )}

        {quote && !quoteLoading && (
          <div className={`rounded-xl border divide-y text-sm ${quoteExpired ? 'border-amber-200 bg-amber-50/60 divide-amber-100/60' : 'border-violet-100 bg-violet-50/50 divide-violet-100/60'}`}>
            {quoteExpired && (
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-amber-600 font-medium text-xs">Quote expired — refresh before swapping</span>
                <button onClick={() => getQuote(amount)}
                  className="flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800 bg-white border border-violet-200 px-2 py-1 rounded-lg transition-colors">
                  <RefreshCw size={11} /> Refresh
                </button>
              </div>
            )}
            {!quoteExpired && (
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs text-gray-400">Quote valid for</span>
                <span className={`text-xs font-medium ${quoteAge > 45 ? 'text-amber-500' : 'text-gray-500'}`}>{Math.max(0, 60 - quoteAge)}s</span>
              </div>
            )}
            {exchangeRate && (
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-gray-500">Rate</span>
                <span className="font-medium text-gray-700">{exchangeRate}</span>
              </div>
            )}
            {priceImpact !== null && (
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-gray-500">Price impact</span>
                <span className={`font-medium ${
                  priceImpactSeverity === 'high' ? 'text-red-600' :
                  priceImpactSeverity === 'medium' ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {priceImpact > 0 ? '+' : ''}{priceImpact.toFixed(2)}%
                </span>
              </div>
            )}
            {priceImpactSeverity === 'high' && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50/80">
                <AlertTriangle size={13} className="text-red-500 shrink-0" />
                <span className="text-xs text-red-600 font-medium">
                  High price impact! You may receive significantly less than expected.
                </span>
              </div>
            )}
            {priceImpactSeverity === 'medium' && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50/80">
                <AlertTriangle size={13} className="text-amber-500 shrink-0" />
                <span className="text-xs text-amber-600 font-medium">
                  Moderate price impact — consider a smaller trade.
                </span>
              </div>
            )}
            {estimatedTime && (
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-gray-500">Estimated time</span>
                <span className="font-medium text-gray-700">{estimatedTime}</span>
              </div>
            )}
            {totalFeesUsd && (
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-gray-500">Estimated fees</span>
                <span className="font-medium text-gray-700">${totalFeesUsd}</span>
              </div>
            )}
            <div className="flex justify-between px-4 py-2.5">
              <span className="text-gray-500">Slippage tolerance</span>
              <button onClick={() => setModal('slippage')}
                className="font-medium text-violet-600 hover:text-violet-800 underline decoration-dotted underline-offset-2 transition-colors">
                {activeSlippage * 100}%
              </button>
            </div>
            <div className="flex justify-between px-4 py-2.5">
              <span className="text-gray-500">Route</span>
              <span className="font-medium text-violet-600">{routeDisplay}</span>
            </div>
          </div>
        )}

        {quoteError && !isSameToken && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-100 text-sm text-red-500">
            <XCircle size={14} /> {quoteError}
          </div>
        )}

        {!isConnected ? (
          <div className="text-center py-2"><p className="text-sm text-gray-400">Connect your wallet to swap</p></div>
        ) : wrongChain ? (
          <button onClick={() => switchChain({ chainId: fromChain.id })}
            className="w-full py-3.5 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', boxShadow: '0 4px 16px rgba(245,158,11,0.35)' }}>
            Switch to {fromChain.name} network
          </button>
        ) : txStatus === 'success' ? (
          <div className="flex flex-col items-center gap-2 py-3">
            <div className="flex items-center gap-2 text-emerald-600 font-medium">
              <CheckCircle size={18} /> Swap successful!
            </div>
            {explorerTxUrl && (
              <a href={explorerTxUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-violet-500 hover:text-violet-700 flex items-center gap-1">
                View on explorer <ExternalLink size={11} />
              </a>
            )}
            <button onClick={() => { setTxStatus('idle'); setTxHash(null); setAmount(''); setQuote(null); setApprovalHash(undefined) }}
              className="mt-1 text-sm text-gray-500 hover:text-gray-700 underline">New swap</button>
          </div>
        ) : txStatus === 'error' ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-100 text-sm text-red-500">
              <XCircle size={14} /> {txError ?? 'Transaction failed'}
            </div>
            <button onClick={() => { setTxStatus('idle'); setTxError(null); setApprovalHash(undefined) }}
              className="w-full py-3 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Try again
            </button>
          </div>
        ) : (
          <button onClick={executeSwap} disabled={!canSwap || txStatus !== 'idle'}
            className="w-full py-3.5 rounded-xl font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{
              background: canSwap ? 'linear-gradient(135deg, #7C3AED 0%, #6d28d9 100%)' : '#e5e7eb',
              color: canSwap ? 'white' : '#9ca3af',
              boxShadow: canSwap ? '0 4px 16px rgba(131,110,249,0.35)' : 'none',
            }}>
            {ctaLabel}
          </button>
        )}
      </div>

      <div className="mt-4 flex items-start gap-2 text-xs text-gray-400">
        <Info size={13} className="mt-0.5 shrink-0" />
        <span>
          Swaps execute directly on-chain via{' '}
          <a href="https://li.fi" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-600">LI.FI</a>
          {' '}aggregation — InkBoard never holds your funds.
        </span>
      </div>

      {modal === 'fromChain' && (
        <ChainModal chains={chains} onSelect={c => { setFromChain(c); setFromToken(c.nativeToken); setQuote(null) }} onClose={() => setModal(null)} />
      )}
      {modal === 'toChain' && (
        <ChainModal chains={chains} onSelect={c => { setToChain(c); setToToken(c.nativeToken); setQuote(null) }} onClose={() => setModal(null)} />
      )}
      {modal === 'fromToken' && (
        <TokenModal chain={fromChain} onSelect={t => { setFromToken(t); setQuote(null) }} onClose={() => setModal(null)} />
      )}
      {modal === 'toToken' && (
        <TokenModal chain={toChain} onSelect={t => { setToToken(t); setQuote(null) }} onClose={() => setModal(null)} />
      )}
      {modal === 'slippage' && (
        <SlippageModal value={activeSlippage} onChange={v => { setActiveSlippage(v); setQuote(null) }} onClose={() => setModal(null)} />
      )}
    </div>
  )
}
