import { NextRequest, NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'

// ─── CSP — Hardened with specific domain allowlists ──────────────────────────
// Replaced wildcard 'https:' with explicit trusted domains.
// 'unsafe-inline' retained for compatibility with Next.js runtime scripts
// and the theme-detection script in layout.tsx.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.walletconnect.com https://*.walletconnect.org https://*.rainbow.me https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://*.coingecko.com https://*.geckoterminal.com https://*.llamao.fi https://*.githubusercontent.com https://*.ipfs.io https://*.pinata.cloud https://*.inkyswap.com https://*.velodrome.finance https://*.tydro.com https://*.nado.xyz",
  "connect-src 'self' https://rpc-gel.inkonchain.com https://rpc-qnd.inkonchain.com https://api.coingecko.com https://pro-api.coingecko.com https://api.geckoterminal.com https://yields.llama.fi https://api.merkl.xyz https://api.vfat.io https://inkyswap.com https://archive.prod.nado.xyz https://api.tydro.com https://explorer.inkonchain.com https://api.inkscan.io https://*.walletconnect.com https://*.walletconnect.org https://*.web3modal.org https://*.web3modal.com wss://*.walletconnect.com wss://*.walletconnect.org https://api.inkboard.pro https://li.quest https://api.thegraph.com https://api.dexscreener.com https://*.inkonchain.com",
  "frame-src 'self' https://*.walletconnect.com https://*.walletconnect.org",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

function setSecurityHeaders(res: NextResponse): void {
  res.headers.set('Content-Security-Policy', CSP)
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  res.headers.set('X-Frame-Options', 'SAMEORIGIN')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()')
  // X-XSS-Protection: 0 is intentional — modern browsers ignore this header
  // and it can introduce vulnerabilities. CSP is the proper XSS defense.
  res.headers.set('X-XSS-Protection', '0')
  res.headers.set('X-Permitted-Cross-Domain-Policies', 'none')
  // Allows wallet popups such as Base Account to keep opener communication.
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
}

// ─── Rate limiter ─────────────────────────────────────────────────────────────

interface KV {
  get(key: string, type: 'text'): Promise<string | null>
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>
}

interface RateEntry { count: number; resetAt: number; lastAccess: number }

const WINDOW_MS = 60_000
const MAX_MEMSTORE_ENTRIES = 500

const ROUTE_LIMITS: Record<string, number> = {
  '/api/approvals-logs':    10,
  '/api/nfts':              10,
  '/api/defi':              15,
  '/api/best-aprs':         12,
  '/api/transactions':      20,
  '/api/portfolio-history': 20,
  '/api/token-exposure':    30,
  '/api/scan-protocol':      5,
  default:                  60,
}

function getLimit(pathname: string): number {
  for (const [route, limit] of Object.entries(ROUTE_LIMITS)) {
    if (route !== 'default' && pathname.startsWith(route)) return limit
  }
  return ROUTE_LIMITS.default
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  )
}

async function getRateLimitKV(): Promise<KV | null> {
  try {
    const { env } = await getCloudflareContext()
    return (env as Record<string, unknown>).CACHE_KV as KV ?? null
  } catch {
    return null
  }
}

const memStore = new Map<string, RateEntry>()

async function checkRateLimit(
  key: string,
  limit: number,
): Promise<{ allowed: boolean; count: number; resetAt: number }> {
  const now = Date.now()
  const kv  = await getRateLimitKV()

  if (kv) {
    try {
      const raw = await kv.get(key, 'text')
      let entry: RateEntry

      if (!raw) {
        entry = { count: 1, resetAt: now + WINDOW_MS, lastAccess: now }
      } else {
        try {
          const parsed = JSON.parse(raw)
          if (
            typeof parsed === 'object' && parsed !== null &&
            typeof parsed.count === 'number' &&
            typeof parsed.resetAt === 'number' &&
            now <= parsed.resetAt
          ) {
            entry = { count: parsed.count + 1, resetAt: parsed.resetAt, lastAccess: now }
          } else {
            entry = { count: 1, resetAt: now + WINDOW_MS, lastAccess: now }
          }
        } catch {
          entry = { count: 1, resetAt: now + WINDOW_MS, lastAccess: now }
        }
      }

      const ttlSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000))
      await kv.put(key, JSON.stringify(entry), { expirationTtl: ttlSec })
      return { allowed: entry.count <= limit, count: entry.count, resetAt: entry.resetAt }
    } catch {
      // KV failed — fall through to in-memory fallback
    }
  }

  // In-memory fallback
  const entry = memStore.get(key)
  if (!entry || now > entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + WINDOW_MS, lastAccess: now })
  } else {
    memStore.set(key, { ...entry, count: entry.count + 1, lastAccess: now })
  }

  // Eviction: delete expired entries first, then LRU
  if (memStore.size > MAX_MEMSTORE_ENTRIES) {
    const entries = Array.from(memStore.entries())
    // First, remove expired entries
    const expired = entries.filter(([, e]) => now > e.resetAt)
    const toDelete = expired.length > 0
      ? expired.slice(0, Math.max(1, Math.floor(entries.length * 0.1)))
      : entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess).slice(0, Math.max(1, Math.floor(entries.length * 0.1)))
    for (const [k] of toDelete) {
      memStore.delete(k)
    }
  }

  const current = memStore.get(key)!
  return { allowed: current.count <= limit, count: current.count, resetAt: current.resetAt }
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (!pathname.startsWith('/api/')) {
    const res = NextResponse.next()
    setSecurityHeaders(res)
    return res
  }

  const ip    = getClientIp(req)
  const limit = getLimit(pathname)
  const key   = `rl:${ip}::${pathname}`

  const { allowed, count, resetAt } = await checkRateLimit(key, limit)

  if (!allowed) {
    const now         = Date.now()
    const retryAfter  = Math.ceil((resetAt - now) / 1000)
    const res = new NextResponse(
      JSON.stringify({ error: 'Too many requests. Please wait before trying again.' }),
      {
        status: 429,
        headers: {
          'Content-Type':          'application/json',
          'Retry-After':           String(retryAfter),
          'X-RateLimit-Limit':     String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset':     String(Math.floor(resetAt / 1000)),
        },
      }
    )
    // Apply security headers to 429 responses as well
    setSecurityHeaders(res)
    return res
  }

  const res = NextResponse.next()
  setSecurityHeaders(res)
  res.headers.set('X-RateLimit-Limit',     String(limit))
  res.headers.set('X-RateLimit-Remaining', String(Math.max(0, limit - count)))
  res.headers.set('X-RateLimit-Reset',     String(Math.floor(resetAt / 1000)))
  return res
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon\\.ico|apple-touch-icon\\.png|ink-logo\\.jpg|inkboard-logo\\.png|ads\\.txt).*)',
}
