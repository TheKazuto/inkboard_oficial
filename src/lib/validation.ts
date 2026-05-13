/**
 * validation.ts — small, dependency-free input validators for API routes.
 *
 * Throws ValidationError on invalid input. Catch in the route or use
 * `requireXxx` helpers that return NextResponse on failure.
 */

import { NextResponse } from 'next/server'
import { EVM_ADDRESS_RE, TX_HASH_RE, CHAIN_ID_RE, COIN_ID_RE } from './constants'

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export function isEvmAddress(v: unknown): v is string {
  return typeof v === 'string' && EVM_ADDRESS_RE.test(v)
}

export function isTxHash(v: unknown): v is string {
  return typeof v === 'string' && TX_HASH_RE.test(v)
}

export function isChainId(v: unknown): v is string {
  return typeof v === 'string' && CHAIN_ID_RE.test(v) && Number(v) > 0
}

export function isCoinId(v: unknown): v is string {
  return typeof v === 'string' && COIN_ID_RE.test(v) && v.length <= 64
}

export function parseEvmAddress(raw: string | null, name = 'address'): string {
  if (!isEvmAddress(raw)) throw new ValidationError(`Invalid ${name}`)
  return raw
}

export function parseTxHash(raw: string | null, name = 'txHash'): string {
  if (!isTxHash(raw)) throw new ValidationError(`Invalid ${name}`)
  return raw
}

export function parseChainId(raw: string | null, name = 'chainId'): string {
  if (!isChainId(raw)) throw new ValidationError(`Invalid ${name}`)
  return raw
}

export function parseEnum<T extends string>(raw: string | null, values: readonly T[], name = 'value'): T {
  if (!raw || !values.includes(raw as T)) throw new ValidationError(`Invalid ${name}`)
  return raw as T
}

/** Returns a 400 NextResponse if validation throws; otherwise returns null. */
export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 })
}
