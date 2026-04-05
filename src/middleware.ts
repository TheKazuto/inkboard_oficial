import { NextRequest, NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'

// ─── CSP ─────────────────────────────────────────────────────────────────────
// Applied via middleware because next.config.js headers() does NOT work
// on Cloudflare Workers with OpenNext.
// Notes:
//   - unsafe-eval removed; re-add if a library requires it at runtime
//   - http: removed from img-src/connect-src/frame-src (HTTPS-only in production)
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https:",
  "worker-src 'self' blob: https:",
  "object-src 'none'",
].join('; ')

function setSecurityHeaders(res: NextResponse): void {
  res.headers.set('Content-Security-Policy', CSP)
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  res.headers.set('X-Frame-Options', 'SAMEORIGIN')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()')
  res.headers.set('X-XSS-Protection', '0')
  res.headers.set('X-Permitted-Cross-Domain-Policies', 'none')
}

// ─── Rate limiter ─────────────────────────────────────────────────────────────
// Uses Cloudflare KV for cross-isolate persistence.
// Falls back to in-memory Map during local dev or on KV failure.
//
// Note: KV read-modify-write is not atomic — a few extra requests may slip
// through under burst concurrency. This is acceptable for approximate rate
// limiting; use Durable Objects for strict atomic enforcement.

interface KV {
  get(key: string, type: 'text'): Promise<string | null>
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>
}

interface RateEntry { count: number; resetAt: number }

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

// cf-connecting-ip is set by Cloudflare and cannot be spoofed by clients.
// x-forwarded-for is kept as fallback for local dev only.
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

// In-memory fallback (local dev / KV unavailable)
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
        entry = { count: 1, resetAt: now + WINDOW_MS }
      } else {
        try {
          const parsed = JSON.parse(raw)
          if (
            typeof parsed === 'object' && parsed !== null &&
            typeof parsed.count === 'number' &&
            typeof parsed.resetAt === 'number' &&
            now <= parsed.resetAt
          ) {
            entry = { count: parsed.count + 1, resetAt: parsed.resetAt }
          } else {
            entry = { count: 1, resetAt: now + WINDOW_MS }
          }
        } catch {
          entry = { count: 1, resetAt: now + WINDOW_MS }
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
    memStore.set(key, { count: 1, resetAt: now + WINDOW_MS })
  } else {
    memStore.set(key, { ...entry, count: entry.count + 1 })
  }

  // Apply eviction if memStore exceeds max entries
  if (memStore.size > MAX_MEMSTORE_ENTRIES) {
    const entries = Array.from(memStore.entries())
    // Delete oldest entries (FIFO)
    for (let i = 0; i < Math.floor(entries.length * 0.1); i++) {
      memStore.delete(entries[i][0])
    }
  }

  const current = memStore.get(key)!
  return { allowed: current.count <= limit, count: current.count, resetAt: current.resetAt }
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Non-API routes: just apply security headers
  if (!pathname.startsWith('/api/')) {
    const res = NextResponse.next()
    setSecurityHeaders(res)
    return res
  }

  // API routes: security headers + rate limiting
  const ip    = getClientIp(req)
  const limit = getLimit(pathname)
  const key   = `rl:${ip}::${pathname}`

  const { allowed, count, resetAt } = await checkRateLimit(key, limit)

  if (!allowed) {
    const now         = Date.now()
    const retryAfter  = Math.ceil((resetAt - now) / 1000)
    return new NextResponse(
      JSON.stringify({ error: 'Too many requests', retryAfter }),
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
  }

  const res = NextResponse.next()
  setSecurityHeaders(res)
  res.headers.set('X-RateLimit-Limit',     String(limit))
  res.headers.set('X-RateLimit-Remaining', String(Math.max(0, limit - count)))
  res.headers.set('X-RateLimit-Reset',     String(Math.floor(resetAt / 1000)))
  return res
}

// Match ALL routes (pages + API) — excludes only static assets
export const config = {
  matcher: '/((?!_next/static|_next/image|favicon\\.ico|apple-touch-icon\\.png|ink-logo\\.jpg|inkboard-logo\\.png|ads\\.txt).*)',
}
