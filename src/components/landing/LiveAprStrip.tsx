'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { useBestApr } from './useBestApr'

function fmtTvl(tvl: number): string {
  if (tvl >= 1_000_000) return `$${(tvl / 1_000_000).toFixed(1)}M`
  if (tvl >= 1_000) return `$${(tvl / 1_000).toFixed(1)}K`
  return `$${tvl.toFixed(0)}`
}

function fmtApr(apr: number): string {
  if (apr >= 100) return apr.toFixed(0)
  if (apr >= 10) return apr.toFixed(1)
  return apr.toFixed(2)
}

export default function LiveAprStrip() {
  const { top, loading, error } = useBestApr()

  // Fallback content if API is down; keeps layout stable.
  if (error && !top) {
    return (
      <div className="lp-strip" role="region" aria-label="Live yield on Ink">
        <div className="lp-strip-left">
          <span className="lp-strip-eyebrow">Live yield on Ink</span>
          <p className="lp-strip-fallback">
            Live yield data across 5+ Ink protocols. Open dashboard to see today&apos;s best.
          </p>
        </div>
        <Link href="/best-aprs" className="lp-strip-cta" aria-label="Open Best APRs">
          Open Best APRs <ArrowUpRight size={16} aria-hidden />
        </Link>
        <style dangerouslySetInnerHTML={{ __html: STRIP_CSS }} />
      </div>
    )
  }

  return (
    <div className="lp-strip" role="region" aria-label="Live yield on Ink">
      <div className="lp-strip-left">
        <span className="lp-strip-eyebrow">
          <span className="lp-strip-pulse" aria-hidden /> Best APR on Ink right now
        </span>
        {loading && !top ? (
          <div className="lp-strip-skel-num" />
        ) : (
          <div className="lp-strip-num" aria-live="polite">
            {fmtApr(top!.apr)}
            <span className="lp-strip-suffix">%</span>
          </div>
        )}
      </div>

      <div className="lp-strip-mid">
        {loading && !top ? (
          <>
            <div className="lp-strip-skel-line" style={{ width: '60%' }} />
            <div className="lp-strip-skel-line" style={{ width: '40%', marginTop: '0.4rem' }} />
          </>
        ) : (
          <>
            <div className="lp-strip-protocol">
              <strong>{top!.protocol}</strong>
              <span className="lp-strip-tag">{top!.type}</span>
            </div>
            <div className="lp-strip-meta">
              <span>{top!.label}</span>
              <span className="lp-strip-sep">·</span>
              <span>{fmtTvl(top!.tvl)} TVL</span>
              {top!.isStable && (
                <>
                  <span className="lp-strip-sep">·</span>
                  <span>stable</span>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <Link
        href="/best-aprs"
        className="lp-strip-cta"
        aria-label="Open Best APRs"
      >
        Open in dashboard <ArrowUpRight size={16} aria-hidden />
      </Link>

      <style dangerouslySetInnerHTML={{ __html: STRIP_CSS }} />
    </div>
  )
}

const STRIP_CSS = `
.lp-strip {
  display: grid;
  grid-template-columns: minmax(0, auto) minmax(0, 1fr) auto;
  gap: clamp(1.25rem, 3vw, 2.5rem);
  align-items: center;
  padding: clamp(1.4rem, 2.8vw, 2rem) clamp(1.4rem, 3vw, 2.2rem);
  background: linear-gradient(180deg, #16122a 0%, #110d20 100%);
  border: 1px solid rgba(140, 110, 240, 0.22);
  border-radius: 22px;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.05) inset, 0 24px 70px -32px rgba(0, 0, 0, 0.7);
  font-family: 'Geist', system-ui, sans-serif;
  /* Reserve enough vertical space for either the skeleton or the resolved
     content so layout doesn't shift when /api/best-aprs lands. */
  min-height: clamp(7.5rem, 10vw, 9rem);
}
@media (max-width: 760px) {
  .lp-strip { grid-template-columns: 1fr; gap: 1rem; padding: 1.4rem; }
}

.lp-strip-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 0.74rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #a78bfa;
  font-weight: 500;
}
.lp-strip-pulse {
  width: 7px; height: 7px; border-radius: 50%;
  background: #5ee0a0;
  box-shadow: 0 0 0 0 rgba(94, 224, 160, 0.6);
  animation: lp-strip-pulse 2.4s cubic-bezier(.2, .7, .2, 1) infinite;
}
@keyframes lp-strip-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(94, 224, 160, 0.45); }
  50%      { box-shadow: 0 0 0 8px rgba(94, 224, 160, 0); }
}
@media (prefers-reduced-motion: reduce) {
  .lp-strip-pulse { animation: none; }
}

.lp-strip-num {
  font-family: 'Bricolage Grotesque', system-ui, sans-serif;
  font-size: clamp(2.6rem, 5vw, 3.8rem);
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1;
  margin-top: 0.55rem;
  color: #f0ecff;
}
.lp-strip-suffix {
  color: #a78bfa;
  margin-left: 0.05em;
}

.lp-strip-protocol {
  display: flex;
  align-items: baseline;
  gap: 0.55rem;
  font-family: 'Bricolage Grotesque', system-ui, sans-serif;
  font-size: clamp(1.4rem, 2.4vw, 1.8rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #f0ecff;
}
.lp-strip-tag {
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 0.66rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(182, 172, 214, 0.7);
  padding: 0.18rem 0.45rem;
  background: rgba(140, 110, 240, 0.12);
  border-radius: 999px;
}
.lp-strip-meta {
  margin-top: 0.35rem;
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 0.82rem;
  color: rgba(182, 172, 214, 0.85);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 0.5rem;
}
.lp-strip-sep { color: rgba(140, 110, 240, 0.35); }

.lp-strip-fallback {
  margin-top: 0.45rem;
  color: rgba(182, 172, 214, 0.85);
  font-size: 0.95rem;
  max-width: 46ch;
}

.lp-strip-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 550;
  font-size: 0.92rem;
  padding: 0.65rem 1.2rem;
  border-radius: 999px;
  background: rgba(140, 110, 240, 0.1);
  border: 1px solid rgba(140, 110, 240, 0.35);
  color: #f0ecff;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
}
.lp-strip-cta:hover {
  background: rgba(140, 110, 240, 0.18);
  border-color: rgba(140, 110, 240, 0.55);
  transform: translateY(-1px);
}
.lp-strip-cta:focus-visible {
  outline: 2px solid #c2b4ff;
  outline-offset: 3px;
}
@media (prefers-reduced-motion: reduce) {
  .lp-strip-cta { transition: none; }
}

.lp-strip-skel-num {
  height: 3.2rem;
  width: 70%;
  margin-top: 0.55rem;
  background: linear-gradient(90deg, rgba(140,110,240,0.08) 25%, rgba(140,110,240,0.18) 50%, rgba(140,110,240,0.08) 75%);
  background-size: 200% 100%;
  border-radius: 8px;
  animation: lp-strip-shimmer 1.6s infinite linear;
}
.lp-strip-skel-line {
  height: 0.85rem;
  background: linear-gradient(90deg, rgba(140,110,240,0.08) 25%, rgba(140,110,240,0.16) 50%, rgba(140,110,240,0.08) 75%);
  background-size: 200% 100%;
  border-radius: 6px;
  animation: lp-strip-shimmer 1.6s infinite linear;
}
@keyframes lp-strip-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
@media (prefers-reduced-motion: reduce) {
  .lp-strip-skel-num, .lp-strip-skel-line { animation: none; }
}
`
