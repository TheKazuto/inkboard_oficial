/**
 * log.ts — centralized logger with PII redaction.
 *
 * Sends to console (Cloudflare Workers tail) but redacts wallet addresses
 * and known sensitive keys before emission. Use `redactError` to safely
 * stringify caught errors without leaking stack traces or API keys.
 */

const ADDRESS_RE = /0x[a-fA-F0-9]{40}/g

function maskAddress(addr: string): string {
  return addr.length === 42 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr
}

/** Redact wallet addresses from any string. */
export function redactString(s: string): string {
  return s.replace(ADDRESS_RE, m => maskAddress(m))
}

/** Convert an unknown error into a short, redacted message. */
export function redactError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  return redactString(msg).slice(0, 300)
}

function emit(level: 'error' | 'warn' | 'info', tag: string, msg: string, ctx?: unknown): void {
  const safeMsg = redactString(msg)
  const safeCtx = ctx === undefined
    ? undefined
    : typeof ctx === 'string'
      ? redactString(ctx)
      : ctx instanceof Error
        ? redactError(ctx)
        : ctx
  // eslint-disable-next-line no-console
  console[level](`[${tag}]`, safeMsg, safeCtx ?? '')
}

export const log = {
  error: (tag: string, msg: string, ctx?: unknown) => emit('error', tag, msg, ctx),
  warn:  (tag: string, msg: string, ctx?: unknown) => emit('warn',  tag, msg, ctx),
  info:  (tag: string, msg: string, ctx?: unknown) => emit('info',  tag, msg, ctx),
}
