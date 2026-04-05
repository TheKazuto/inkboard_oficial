/**
 * kvCache.ts — Cloudflare KV-backed cache with in-memory fallback.
 *
 * On Cloudflare Workers each request may run in a different isolate,
 * so module-level variables (Map, let) are effectively per-request.
 * This utility stores cached data in KV so it persists across isolates.
 *
 * In local dev (where KV binding is unavailable) it falls back to an
 * in-memory Map — same behaviour as before, just wrapped in the same API.
 *
 * Usage:
 *   import { kvGet, kvSet } from '@/lib/kvCache'
 *
 *   const cached = await kvGet<MyType>('best-aprs', 3 * 60_000)
 *   if (cached.data && cached.fresh) return cached.data   // fast path
 *   const freshData = await fetchUpstream()
 *   await kvSet('best-aprs', freshData, 600)              // hard TTL 10 min
 *   // On fetch error, cached.data is still available as stale fallback
 */

import { getCloudflareContext } from '@opennextjs/cloudflare'

// ─── Types ────────────────────────────────────────────────────────────────────

/** Minimal KV interface — avoids depending on @cloudflare/workers-types */
interface KV {
  get(key: string, type: 'text'): Promise<string | null>
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>
}

interface Envelope<T> {
  d: T          // data
  t: number     // fetchedAt (epoch ms)
}

export interface CacheResult<T> {
  data:  T | null   // null = cache miss
  fresh: boolean    // within softTtl?
}

// ─── KV binding accessor ──────────────────────────────────────────────────────

async function getKV(): Promise<KV | null> {
  try {
    const { env } = await getCloudflareContext()
    const kv = (env as Record<string, unknown>).CACHE_KV as KV | undefined
    return kv ?? null
  } catch {
    return null
  }
}

// ─── In-memory fallback (local dev / KV unavailable) ──────────────────────────

const memStore = new Map<string, string>()
const MAX_MEMSTORE_ENTRIES = 500

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Read from cache.
 *
 * @param key        Cache key (e.g. 'best-aprs', 'lifi-tokens:57073')
 * @param softTtlMs  How long the data is considered "fresh" (ms).
 *                   Data older than this is returned with `fresh: false`
 *                   so callers can try a refresh while still having a stale fallback.
 * @returns          `{ data, fresh }` — data is null on complete miss.
 */
export async function kvGet<T>(key: string, softTtlMs: number): Promise<CacheResult<T>> {
  let raw: string | null = null

  // Try KV first
  try {
    const kv = await getKV()
    if (kv) raw = await kv.get(key, 'text')
  } catch (e) {
    console.error(`[kvCache] KV get(${key}) failed, using memStore:`, e)
  }

  // Fall back to in-memory if KV miss or KV failed
  if (raw === null) {
    raw = memStore.get(key) ?? null
  }

  if (!raw) return { data: null, fresh: false }

  try {
    const envelope = JSON.parse(raw)
    if (
      typeof envelope !== 'object' || envelope === null ||
      !('d' in envelope) || !('t' in envelope) ||
      typeof envelope.t !== 'number'
    ) {
      return { data: null, fresh: false }
    }
    const age = Date.now() - (envelope as Envelope<T>).t
    return { data: (envelope as Envelope<T>).d, fresh: age < softTtlMs }
  } catch {
    return { data: null, fresh: false }
  }
}

/**
 * Write to cache.
 *
 * @param key           Cache key
 * @param data          Data to store (must be JSON-serializable)
 * @param hardTtlSec    KV hard expiration in seconds — KV auto-deletes after this.
 *                      Should be ≥ 2× the soft TTL to keep stale fallback available.
 */
export async function kvSet<T>(key: string, data: T, hardTtlSec: number): Promise<void> {
  const envelope: Envelope<T> = { d: data, t: Date.now() }
  const raw = JSON.stringify(envelope)

  // Always write to in-memory (guarantees same-isolate cache works)
  memStore.set(key, raw)

  // Apply eviction if memStore exceeds max entries
  if (memStore.size > MAX_MEMSTORE_ENTRIES) {
    const entries = Array.from(memStore.entries())
    // Delete oldest entries (FIFO)
    for (let i = 0; i < Math.floor(entries.length * 0.1); i++) {
      memStore.delete(entries[i][0])
    }
  }

  // Also try KV for cross-isolate persistence
  try {
    const kv = await getKV()
    if (kv) {
      await kv.put(key, raw, { expirationTtl: Math.max(60, hardTtlSec) })
    }
  } catch (e) {
    console.error(`[kvCache] KV set(${key}) failed, memStore still updated:`, e)
  }
}
