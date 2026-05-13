'use client'

import { TrendingUp, Wallet, Sparkles } from 'lucide-react'
import { useBestApr, type AprEntry } from './useBestApr'

const FALLBACK_TOP: AprEntry = {
  protocol: 'Velodrome',
  logo: '',
  url: '',
  tokens: ['USDC', 'USDT0'],
  label: 'USDC / USDT0',
  apr: 24.1,
  tvl: 1_200_000,
  type: 'pool',
  isStable: true,
}

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

export default function HeroDashboardMock() {
  const { top, loading } = useBestApr()
  const display = top ?? FALLBACK_TOP

  return (
    <div className="lp-hmock" role="img" aria-label="InkBoard dashboard preview">
      {/* Window chrome */}
      <div className="lp-hmock-chrome">
        <span className="lp-hmock-dot" style={{ background: '#3d3551' }} />
        <span className="lp-hmock-dot" style={{ background: '#3d3551' }} />
        <span className="lp-hmock-dot" style={{ background: '#3d3551' }} />
        <span className="lp-hmock-addr">inkboard.app / dashboard</span>
      </div>

      {/* Body */}
      <div className="lp-hmock-body">
        {/* Wallet summary card */}
        <div className="lp-hmock-card lp-hmock-summary">
          <div className="lp-hmock-eyebrow">
            <Wallet size={12} aria-hidden /> Total portfolio
          </div>
          <div className="lp-hmock-big">$24,318.92</div>
          <div className="lp-hmock-trend">
            <TrendingUp size={12} aria-hidden /> +$571.40 today &nbsp;·&nbsp; <span style={{ color: '#5ee0a0' }}>+2.41%</span>
          </div>

          {/* Sparkline */}
          <svg viewBox="0 0 240 60" preserveAspectRatio="none" className="lp-hmock-spark" aria-hidden="true">
            <defs>
              <linearGradient id="hm-spark-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#836EF9" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#836EF9" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0,46 L20,42 L42,48 L62,32 L84,36 L106,24 L128,30 L150,18 L172,26 L196,14 L218,20 L240,8 L240,60 L0,60 Z"
              fill="url(#hm-spark-grad)"
            />
            <path
              d="M0,46 L20,42 L42,48 L62,32 L84,36 L106,24 L128,30 L150,18 L172,26 L196,14 L218,20 L240,8"
              fill="none"
              stroke="#A78BFA"
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Best APR live card */}
        <div className="lp-hmock-card lp-hmock-apr">
          <div className="lp-hmock-live-row">
            <span className="lp-hmock-eyebrow lp-hmock-eyebrow-live">
              <span className="lp-hmock-pulse" aria-hidden /> Live · Best APR on Ink
            </span>
          </div>
          {loading && !top ? (
            <>
              <div className="lp-hmock-skel lp-hmock-skel-num" />
              <div className="lp-hmock-skel lp-hmock-skel-meta" />
            </>
          ) : (
            <>
              <div className="lp-hmock-apr-num">
                {fmtApr(display.apr)}<span className="lp-hmock-apr-suffix">%</span>
              </div>
              <div className="lp-hmock-apr-meta">
                <strong>{display.protocol}</strong>
                <span className="lp-hmock-sep">·</span>
                <span>{display.label}</span>
                <span className="lp-hmock-sep">·</span>
                <span>{fmtTvl(display.tvl)} TVL</span>
              </div>
            </>
          )}
        </div>

        {/* Mini token row */}
        <div className="lp-hmock-card lp-hmock-tokens">
          <div className="lp-hmock-eyebrow">
            <Sparkles size={12} aria-hidden /> Holdings
          </div>
          <div className="lp-hmock-token-list">
            {[
              { sym: 'ETH', val: '$15,420', pct: '63.4%' },
              { sym: 'USDC', val: '$5,200', pct: '21.4%' },
              { sym: 'kBTC', val: '$3,698', pct: '15.2%' },
            ].map(t => (
              <div key={t.sym} className="lp-hmock-token-row">
                <span className="lp-hmock-token-dot" />
                <span className="lp-hmock-token-sym">{t.sym}</span>
                <span className="lp-hmock-token-val">{t.val}</span>
                <span className="lp-hmock-token-pct">{t.pct}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .lp-hmock {
          position: relative;
          background: linear-gradient(160deg, #1a1633 0%, #110d20 100%);
          border: 1px solid rgba(140, 110, 240, 0.25);
          border-radius: 22px;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.06) inset,
            0 30px 80px -28px rgba(0, 0, 0, 0.75),
            0 0 0 1px rgba(255, 255, 255, 0.02);
          overflow: hidden;
          font-family: 'Geist', system-ui, sans-serif;
        }

        .lp-hmock-chrome {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.8rem 1rem;
          border-bottom: 1px solid rgba(140, 110, 240, 0.12);
          background: rgba(255, 255, 255, 0.015);
        }
        .lp-hmock-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
        }
        .lp-hmock-addr {
          margin-left: auto;
          font-family: 'Geist Mono', ui-monospace, monospace;
          font-size: 0.7rem;
          color: rgba(182, 172, 214, 0.7);
          letter-spacing: 0.02em;
        }

        .lp-hmock-body {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          grid-template-rows: auto auto;
          gap: 0.7rem;
          padding: 1rem;
        }
        .lp-hmock-summary {
          grid-column: 1 / 2;
          grid-row: 1 / 3;
        }
        .lp-hmock-apr {
          grid-column: 2 / 3;
          grid-row: 1 / 2;
        }
        .lp-hmock-tokens {
          grid-column: 2 / 3;
          grid-row: 2 / 3;
        }
        @media (max-width: 540px) {
          .lp-hmock-body {
            grid-template-columns: 1fr;
            grid-template-rows: auto auto auto;
          }
          .lp-hmock-summary,
          .lp-hmock-apr,
          .lp-hmock-tokens {
            grid-column: 1;
            grid-row: auto;
          }
        }

        .lp-hmock-card {
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid rgba(140, 110, 240, 0.14);
          border-radius: 14px;
          padding: 0.9rem 1rem;
        }
        .lp-hmock-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-family: 'Geist Mono', ui-monospace, monospace;
          font-size: 0.66rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(182, 172, 214, 0.75);
        }
        .lp-hmock-eyebrow-live {
          color: #a78bfa;
        }
        .lp-hmock-pulse {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #5ee0a0;
          box-shadow: 0 0 0 0 rgba(94, 224, 160, 0.6);
          animation: lp-hmock-pulse 2.4s cubic-bezier(0.2, 0.7, 0.2, 1) infinite;
        }
        @keyframes lp-hmock-pulse {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(94, 224, 160, 0.45);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(94, 224, 160, 0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .lp-hmock-pulse {
            animation: none;
          }
        }

        .lp-hmock-big {
          font-family: 'Bricolage Grotesque', system-ui, sans-serif;
          font-size: clamp(1.45rem, 2.4vw, 1.95rem);
          font-weight: 700;
          letter-spacing: -0.02em;
          margin-top: 0.4rem;
          color: #f0ecff;
          line-height: 1;
        }
        .lp-hmock-trend {
          margin-top: 0.45rem;
          font-size: 0.78rem;
          color: rgba(182, 172, 214, 0.75);
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
        }
        .lp-hmock-spark {
          display: block;
          width: 100%;
          height: 64px;
          margin-top: 0.9rem;
        }

        .lp-hmock-apr-num {
          font-family: 'Bricolage Grotesque', system-ui, sans-serif;
          font-size: clamp(1.6rem, 3vw, 2.2rem);
          font-weight: 700;
          letter-spacing: -0.03em;
          margin-top: 0.5rem;
          color: #f0ecff;
          line-height: 1;
        }
        .lp-hmock-apr-suffix {
          color: #a78bfa;
          margin-left: 0.05em;
        }
        .lp-hmock-apr-meta {
          margin-top: 0.45rem;
          font-family: 'Geist Mono', ui-monospace, monospace;
          font-size: 0.72rem;
          color: rgba(182, 172, 214, 0.85);
          line-height: 1.4;
        }
        .lp-hmock-apr-meta strong {
          color: #f0ecff;
          font-weight: 550;
        }
        .lp-hmock-sep {
          color: rgba(140, 110, 240, 0.35);
          margin: 0 0.35rem;
        }

        .lp-hmock-token-list {
          margin-top: 0.55rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .lp-hmock-token-row {
          display: grid;
          grid-template-columns: 14px auto 1fr auto;
          gap: 0.45rem;
          align-items: center;
          font-size: 0.74rem;
        }
        .lp-hmock-token-dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: linear-gradient(135deg, #836ef9, #4c1d95);
          flex-shrink: 0;
        }
        .lp-hmock-token-sym {
          color: #f0ecff;
          font-weight: 550;
        }
        .lp-hmock-token-val {
          font-family: 'Geist Mono', ui-monospace, monospace;
          color: rgba(182, 172, 214, 0.85);
          text-align: right;
        }
        .lp-hmock-token-pct {
          font-family: 'Geist Mono', ui-monospace, monospace;
          color: rgba(140, 110, 240, 0.7);
          font-size: 0.7rem;
        }

        .lp-hmock-skel {
          background: linear-gradient(
            90deg,
            rgba(140, 110, 240, 0.08) 25%,
            rgba(140, 110, 240, 0.16) 50%,
            rgba(140, 110, 240, 0.08) 75%
          );
          background-size: 200% 100%;
          animation: lp-hmock-shimmer 1.6s infinite linear;
          border-radius: 6px;
        }
        .lp-hmock-skel-num {
          height: 1.7rem;
          width: 50%;
          margin-top: 0.5rem;
        }
        .lp-hmock-skel-meta {
          height: 0.7rem;
          width: 80%;
          margin-top: 0.7rem;
        }
        @keyframes lp-hmock-shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .lp-hmock-skel {
            animation: none;
          }
        }
      ` }} />
    </div>
  )
}
