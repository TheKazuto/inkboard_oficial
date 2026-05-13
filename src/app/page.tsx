import Link from 'next/link'
import {
  ArrowRight,
  Activity,
  Shield,
  Network,
  Sparkles,
  Repeat,
  Layers,
} from 'lucide-react'

import Reveal from '@/components/landing/Reveal'
import HeroDashboardMock from '@/components/landing/HeroDashboardMock'
import LiveAprStrip from '@/components/landing/LiveAprStrip'
import LaunchButton from '@/components/landing/LaunchButton'

// ─── Static content ──────────────────────────────────────────────────────────

const ECOSYSTEM_PRIMARY = [
  {
    name: 'Velodrome',
    kind: 'DEX & yield',
    meta: 'AERO emissions plus Slipstream gauges. Native fee APR and rewards aggregated from vfat, no Sugar RPC.',
  },
  {
    name: 'Tydro',
    kind: 'Lending',
    meta: '12 reserves quoted on-chain. Supply APR straight from the RAY rate, plus Merkl incentive overlay.',
  },
] as const

const ECOSYSTEM_SECONDARY = ['InkySwap', 'Nado', 'Curve', 'Merkl', 'OpenSea'] as const

const CAPABILITIES = [
  {
    eyebrow: '01 · Portfolio',
    title: 'Every position you hold on Ink, in one view.',
    body: 'Tokens, NFTs, lending balances, liquidity. Aggregated and priced in real time. Read-only by default; nothing leaves your wallet.',
    mock: 'portfolio' as const,
  },
  {
    eyebrow: '02 · Yields',
    title: 'The best APR on Ink, refreshed every minute.',
    body: 'Velodrome, InkySwap, Tydro, Nado, Curve. Real APR, real TVL, ranked. No inflated reward math.',
    mock: 'yields' as const,
  },
  {
    eyebrow: '03 · Swap & bridge',
    title: 'Route across 70+ chains via LI.FI.',
    body: 'Best route from 360+ DEXes and bridges, quoted server-side. Sign in your wallet, watch the status, done.',
    mock: 'swap' as const,
  },
] as const

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: LANDING_CSS }} />

      <div className="lp-root">
        {/* ── Header ── */}
        <header className="lp-header">
          <Link href="/" className="lp-logo" aria-label="InkBoard home">
            <span className="lp-logo-mark">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/inkboard-logo.png" alt="" width={30} height={30} />
            </span>
            <span className="lp-logo-text">
              Ink<strong>Board</strong>
            </span>
          </Link>
          <LaunchButton
            className="lp-btn lp-btn-primary"
            ariaLabel="Launch dashboard"
          >
            Launch Dashboard <ArrowRight size={16} aria-hidden />
          </LaunchButton>
        </header>

        <div className="lp-shell">
          {/* ── Hero ── */}
          <section className="lp-hero" aria-label="Introduction">
            <div className="lp-hero-bg" aria-hidden="true" />
            <div className="lp-hero-grid">
              <Reveal delay={0}>
                <span className="lp-eyebrow">The Ink Network dashboard</span>
                <h1 className="lp-h1">Your portfolio on Ink, in one canvas.</h1>
                <p className="lp-sub">
                  Track tokens, DeFi positions, NFTs and yields across the Ink ecosystem in real time.
                  Custody-free, built by Shinka Labs.
                </p>
                <div className="lp-hero-cta">
                  <LaunchButton className="lp-btn lp-btn-primary lp-btn-lg">
                    Launch Dashboard <ArrowRight size={18} aria-hidden />
                  </LaunchButton>
                  <a href="#capabilities" className="lp-btn lp-btn-ghost lp-btn-lg">
                    Explore features
                  </a>
                </div>
                <div className="lp-stat-strip" aria-label="At a glance">
                  <span>
                    <strong>5+</strong>&nbsp;protocols
                  </span>
                  <span className="lp-pillsep">·</span>
                  <span>
                    <strong>70+</strong>&nbsp;chains for swap
                  </span>
                  <span className="lp-pillsep">·</span>
                  <span>Custody-free</span>
                  <span className="lp-pillsep">·</span>
                  <span>Live data</span>
                </div>
              </Reveal>

              <HeroDashboardMock />
            </div>
          </section>

          <div className="lp-rule" aria-hidden="true" />

          {/* ── Live APR strip ── */}
          <section
            className="lp-section lp-section-tight"
            aria-label="Live yield on Ink"
          >
            <Reveal>
              <LiveAprStrip />
            </Reveal>
          </section>

          <div className="lp-rule" aria-hidden="true" />

          {/* ── Ecosystem ── */}
          <section className="lp-section" aria-label="Ecosystem coverage">
            <Reveal>
              <span className="lp-eyebrow">Ecosystem coverage</span>
              <h2 className="lp-h2">Every major Ink protocol, integrated natively.</h2>
              <p className="lp-section-lede">
                Yield, lending, liquidity and marketplace data straight from the source, ranked in one view.
              </p>
            </Reveal>

            <div className="lp-eco-grid">
              {ECOSYSTEM_PRIMARY.map((p, i) => (
                <Reveal key={p.name} delay={80 + i * 80}>
                  <article className="lp-eco-card">
                    <span className="lp-eco-kind">{p.kind}</span>
                    <h3 className="lp-eco-name">{p.name}</h3>
                    <p className="lp-eco-meta">{p.meta}</p>
                  </article>
                </Reveal>
              ))}
            </div>

            <Reveal>
              <div className="lp-eco-row" aria-label="Additional protocols">
                {ECOSYSTEM_SECONDARY.map((p) => (
                  <span key={p} className="lp-eco-chip">
                    {p}
                  </span>
                ))}
              </div>
            </Reveal>
          </section>

          <div className="lp-rule" aria-hidden="true" />

          {/* ── Capabilities ── */}
          <section className="lp-section" id="capabilities" aria-label="Capabilities">
            <Reveal>
              <span className="lp-eyebrow">Built around the wallet</span>
              <h2 className="lp-h2 lp-cap-heading">
                Five tools you&apos;d otherwise open in five tabs.
              </h2>
            </Reveal>

            {CAPABILITIES.map((c, i) => (
              <article
                key={c.eyebrow}
                className={`lp-cap${i % 2 === 1 ? ' lp-cap-flip' : ''}`}
              >
                <Reveal>
                  <div>
                    <span className="lp-eyebrow">{c.eyebrow}</span>
                    <h3 className="lp-cap-title">{c.title}</h3>
                    <p>{c.body}</p>
                  </div>
                </Reveal>
                <Reveal delay={120}>
                  <CapabilityMock kind={c.mock} />
                </Reveal>
              </article>
            ))}

            <Reveal>
              <p className="lp-cap-footer">
                Also inside: full transaction history with smart classification, an NFT inventory, and an approval
                scanner with one-click revoke. See{' '}
                <Link href="/security" className="lp-inline-link">
                  Security
                </Link>{' '}
                and{' '}
                <Link href="/transactions" className="lp-inline-link">
                  Transactions
                </Link>
                .
              </p>
            </Reveal>
          </section>

          {/* ── Trust line ── */}
          <div className="lp-section lp-section-tight" aria-label="Trust">
            <Reveal>
              <div className="lp-trust">
                <div className="lp-trust-item">
                  <div className="lp-trust-icon">
                    <Sparkles size={18} aria-hidden />
                  </div>
                  <div>
                    <div className="lp-trust-title">Built by Shinka Labs</div>
                    <div className="lp-trust-sub">DeFi engineering studio</div>
                  </div>
                </div>
                <div className="lp-trust-item">
                  <div className="lp-trust-icon">
                    <Network size={18} aria-hidden />
                  </div>
                  <div>
                    <div className="lp-trust-title">Powered by Ink Network</div>
                    <div className="lp-trust-sub">Chain ID 57073</div>
                  </div>
                </div>
                <div className="lp-trust-item">
                  <div className="lp-trust-icon">
                    <Shield size={18} aria-hidden />
                  </div>
                  <div>
                    <div className="lp-trust-title">Custody-free</div>
                    <div className="lp-trust-sub">Read-only by default</div>
                  </div>
                </div>
                <div className="lp-trust-item">
                  <div className="lp-trust-icon">
                    <Activity size={18} aria-hidden />
                  </div>
                  <div>
                    <div className="lp-trust-title">Live data</div>
                    <div className="lp-trust-sub">Refreshed every minute</div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* ── Final CTA ── */}
          <section className="lp-final" aria-label="Get started">
            <div className="lp-final-bg" aria-hidden="true" />
            <Reveal>
              <span className="lp-eyebrow">Get started</span>
              <h2 className="lp-final-h">Open InkBoard.</h2>
              <p className="lp-final-sub">
                It&apos;s free. Connect your wallet when you&apos;re ready.
              </p>
              <LaunchButton className="lp-btn lp-btn-primary lp-btn-lg lp-final-cta">
                Launch Dashboard <ArrowRight size={18} aria-hidden />
              </LaunchButton>
            </Reveal>
          </section>

          {/* ── Footer ── */}
          <footer className="lp-footer">
            Built by{' '}
            <a
              href="https://www.shinkalabs.tech/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Shinka Labs
            </a>
            <span className="lp-foot-sep">·</span>InkBoard
            <span className="lp-foot-sep">·</span>
            <a
              href="https://t.me/ShinkaLabs"
              target="_blank"
              rel="noopener noreferrer"
            >
              Telegram
            </a>
            <span className="lp-foot-sep">·</span>
            <a
              href="https://x.com/XShinkaLabsX"
              target="_blank"
              rel="noopener noreferrer"
            >
              Twitter
            </a>
            <span className="lp-foot-sep">·</span>
            <a
              href="https://discord.gg/n6V8WV5ZN4"
              target="_blank"
              rel="noopener noreferrer"
            >
              Discord
            </a>
          </footer>
        </div>
      </div>
    </>
  )
}

// ─── Capability mini-mocks (inline JSX, no client interactivity) ──────────────

function CapabilityMock({ kind }: { kind: 'portfolio' | 'yields' | 'swap' }) {
  if (kind === 'portfolio') {
    return (
      <div className="lp-cmock" role="img" aria-label="Portfolio overview preview">
        <div className="lp-cmock-head">
          <div>
            <div className="lp-cmock-eyebrow">Total portfolio</div>
            <div className="lp-cmock-big">$24,318.92</div>
          </div>
          <span className="lp-cmock-pill lp-cmock-pill-up">+2.41%</span>
        </div>
        <svg
          viewBox="0 0 240 60"
          preserveAspectRatio="none"
          className="lp-cmock-spark"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="cmock-port-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#836EF9" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#836EF9" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,42 L18,38 L38,44 L60,30 L82,32 L104,22 L126,28 L150,18 L172,24 L196,14 L218,18 L240,10 L240,60 L0,60 Z"
            fill="url(#cmock-port-grad)"
          />
          <path
            d="M0,42 L18,38 L38,44 L60,30 L82,32 L104,22 L126,28 L150,18 L172,24 L196,14 L218,18 L240,10"
            fill="none"
            stroke="#A78BFA"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
        <div className="lp-cmock-rows">
          {[
            { sym: 'ETH', name: 'Ethereum', val: '$15,420' },
            { sym: 'USDC', name: 'USD Coin', val: '$5,200' },
            { sym: 'kBTC', name: 'Kraken BTC', val: '$3,698' },
          ].map((t) => (
            <div key={t.sym} className="lp-cmock-row">
              <span className="lp-cmock-dot" />
              <span className="lp-cmock-sym">
                <strong>{t.sym}</strong>
                <span className="lp-cmock-name">{t.name}</span>
              </span>
              <span className="lp-cmock-val">{t.val}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (kind === 'yields') {
    const rows = [
      { p: 'Velodrome', t: 'USDC / USDT0', apr: 24.1, tvl: '1.2M', top: true },
      { p: 'Tydro', t: 'USDe supply', apr: 9.1, tvl: '4.6M', top: false },
      { p: 'InkySwap', t: 'WETH / USDC v3', apr: 7.3, tvl: '0.8M', top: false },
      { p: 'Curve', t: '3pool', apr: 4.2, tvl: '2.1M', top: false },
    ]
    return (
      <div className="lp-cmock" role="img" aria-label="Best APRs preview">
        <div className="lp-cmock-eyebrow">
          <Layers size={12} aria-hidden style={{ marginRight: 4 }} /> Best APR · ranked
        </div>
        <div className="lp-cmock-yrows">
          {rows.map((r) => (
            <div
              key={r.p}
              className={`lp-cmock-yrow ${r.top ? 'lp-cmock-yrow-top' : ''}`}
            >
              <div>
                <div className="lp-cmock-yp">{r.p}</div>
                <div className="lp-cmock-yt">{r.t}</div>
              </div>
              <div className="lp-cmock-ytvl">${r.tvl} TVL</div>
              <div className={`lp-cmock-yapr ${r.top ? 'lp-cmock-yapr-top' : ''}`}>
                {r.apr}%
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="lp-cmock" role="img" aria-label="Swap and bridge preview">
      <div className="lp-cmock-eyebrow">You send</div>
      <div className="lp-cmock-swap-in">
        <span className="lp-cmock-swap-amt">1.250 ETH</span>
        <span className="lp-cmock-swap-chain">Ethereum</span>
      </div>
      <div className="lp-cmock-swap-arrow">
        <Repeat size={14} aria-hidden />
      </div>
      <div className="lp-cmock-eyebrow">You receive</div>
      <div className="lp-cmock-swap-out">
        <span className="lp-cmock-swap-amt">4,028.41 USDT0</span>
        <span className="lp-cmock-swap-chain">Ink</span>
      </div>
      <div className="lp-cmock-swap-meta">
        <span>Route via LI.FI</span>
        <span className="lp-cmock-swap-sep">·</span>
        <span>Slippage 0.5%</span>
        <span className="lp-cmock-swap-sep">·</span>
        <span>~22s</span>
      </div>
    </div>
  )
}

// ─── Landing CSS (scoped under .lp-root) ─────────────────────────────────────

const LANDING_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=Geist:wght@300..700&family=Geist+Mono:wght@400..600&display=swap');

.lp-root {
  --lp-bg: #0a0814;
  --lp-bg-elev: #110d20;
  --lp-bg-card: #16122a;
  --lp-bg-card-2: #1a1633;
  --lp-text: #f0ecff;
  --lp-text-2: #b6acd6;
  --lp-text-3: #7e7596;
  --lp-line: rgba(140, 110, 240, 0.14);
  --lp-line-2: rgba(140, 110, 240, 0.22);
  --lp-violet: #836EF9;
  --lp-violet-2: #6d28d9;
  --lp-violet-deep: #4c1d95;
  --lp-violet-glow: rgba(131, 110, 249, 0.22);
  --lp-accent-pos: #5ee0a0;

  background: var(--lp-bg);
  color: var(--lp-text);
  font-family: 'Geist', system-ui, -apple-system, sans-serif;
  font-feature-settings: 'ss01', 'cv11';
  min-height: 100vh;
  overflow-x: hidden;
  isolation: isolate;
}
.lp-root *,
.lp-root *::before,
.lp-root *::after { box-sizing: border-box; }
.lp-root :where(h1, h2, h3, h4) {
  font-family: 'Bricolage Grotesque', system-ui, sans-serif;
  letter-spacing: -0.03em;
  line-height: 1.04;
  font-weight: 700;
  color: var(--lp-text);
}
.lp-root :where(p) { line-height: 1.65; color: var(--lp-text-2); }
.lp-root :where(strong) { color: var(--lp-text); font-weight: 600; }
.lp-root a:focus-visible,
.lp-root button:focus-visible {
  outline: 2px solid #c2b4ff;
  outline-offset: 3px;
}

/* ── Header ── */
.lp-header {
  position: fixed;
  inset: 0 0 auto 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 clamp(1rem, 3vw, 2.25rem);
  background: rgba(10, 8, 20, 0.78);
  -webkit-backdrop-filter: saturate(140%) blur(14px);
  backdrop-filter: saturate(140%) blur(14px);
  border-bottom: 1px solid var(--lp-line);
}
.lp-logo {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  color: inherit;
  text-decoration: none;
  font-weight: 600;
  font-size: 1.05rem;
}
.lp-logo-mark {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 6px 22px rgba(131, 110, 249, 0.4);
  display: inline-flex;
}
.lp-logo-mark img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.lp-logo-text strong { color: var(--lp-violet); font-weight: 700; }

/* ── Buttons ── */
.lp-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-family: inherit;
  font-weight: 550;
  font-size: 0.92rem;
  padding: 0.6rem 1.2rem;
  border-radius: 999px;
  text-decoration: none;
  cursor: pointer;
  border: 1px solid transparent;
  transition:
    transform 0.18s cubic-bezier(0.2, 0.7, 0.2, 1),
    box-shadow 0.18s cubic-bezier(0.2, 0.7, 0.2, 1),
    background 0.18s,
    border-color 0.18s;
  white-space: nowrap;
}
.lp-btn-lg { padding: 0.95rem 1.7rem; font-size: 1rem; }

.lp-btn-primary {
  background: var(--lp-violet-2);
  color: #ffffff;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.18) inset,
    0 8px 28px -8px var(--lp-violet-glow);
}
.lp-btn-primary:hover {
  background: var(--lp-violet);
  transform: translateY(-1px);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.22) inset,
    0 12px 36px -8px var(--lp-violet-glow);
}
.lp-btn-primary:active {
  transform: translateY(0);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.12) inset,
    0 4px 14px -4px var(--lp-violet-glow);
}

.lp-btn-ghost {
  background: transparent;
  color: var(--lp-text);
  border-color: var(--lp-line-2);
}
.lp-btn-ghost:hover {
  background: rgba(131, 110, 249, 0.07);
  border-color: rgba(131, 110, 249, 0.5);
}
.lp-btn-ghost:active {
  background: rgba(131, 110, 249, 0.12);
}

@media (prefers-reduced-motion: reduce) {
  .lp-btn { transition: none; }
  .lp-btn-primary:hover,
  .lp-btn-ghost:hover,
  .lp-btn-primary:active { transform: none; }
}

/* ── Sections ── */
.lp-shell { position: relative; padding: 64px 0 0; }
.lp-section {
  padding-block: clamp(4rem, 8vw, 7rem);
  padding-inline: clamp(1.25rem, 4vw, 2.5rem);
  max-width: 1200px;
  margin-inline: auto;
}
.lp-section-tight { padding-block: clamp(2.5rem, 5vw, 4rem); }
.lp-section-lede {
  max-width: 46ch;
  margin-top: 0.8rem;
  font-size: 1rem;
}
.lp-rule {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--lp-line-2), transparent);
  margin-inline: clamp(1.25rem, 4vw, 2.5rem);
}

/* ── Hero ── */
.lp-hero {
  position: relative;
  padding-block: clamp(5rem, 10vw, 8rem) clamp(3rem, 6vw, 5rem);
  padding-inline: clamp(1.25rem, 4vw, 2.5rem);
  max-width: 1200px;
  margin-inline: auto;
}
.lp-hero-bg {
  position: absolute;
  top: -100px;
  bottom: 0;
  left: calc(50% - 50vw);
  right: calc(50% - 50vw);
  pointer-events: none;
  z-index: -1;
  overflow: hidden;
}
.lp-hero-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 60% 50% at 78% 30%, rgba(131, 110, 249, 0.22) 0%, transparent 65%),
    radial-gradient(ellipse 40% 35% at 14% 18%, rgba(76, 29, 149, 0.18) 0%, transparent 65%);
}
.lp-hero-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.03) 1px, transparent 0);
  background-size: 28px 28px;
  -webkit-mask-image: linear-gradient(180deg, black 0%, transparent 85%);
  mask-image: linear-gradient(180deg, black 0%, transparent 85%);
}

.lp-hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1.2fr);
  gap: clamp(2rem, 5vw, 4rem);
  align-items: center;
}
@media (max-width: 920px) {
  .lp-hero-grid { grid-template-columns: 1fr; }
}

.lp-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 0.74rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--lp-violet);
  font-weight: 500;
}
.lp-eyebrow::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--lp-violet);
  box-shadow: 0 0 12px var(--lp-violet);
}

.lp-h1 {
  font-size: clamp(2.6rem, 5.4vw, 4.8rem);
  margin-block: 1.4rem 1.2rem;
  max-width: 16ch;
}
.lp-h2 {
  font-size: clamp(1.9rem, 3.2vw, 2.8rem);
  max-width: 22ch;
  margin-block: 1rem 0.6rem;
}
.lp-sub {
  font-size: clamp(1.02rem, 1.45vw, 1.18rem);
  color: var(--lp-text-2);
  max-width: 46ch;
}

.lp-hero-cta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-block: 2rem 2.2rem;
}
.lp-stat-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 0.85rem;
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 0.82rem;
  color: var(--lp-text-3);
}
.lp-stat-strip > * { display: inline-flex; align-items: center; gap: 0.35rem; }
.lp-stat-strip strong { color: var(--lp-text); font-weight: 500; }
.lp-pillsep { color: var(--lp-line-2); }

/* ── Ecosystem ── */
.lp-eco-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-block: 2.4rem 1.4rem;
}
@media (max-width: 760px) {
  .lp-eco-grid { grid-template-columns: 1fr; }
}
.lp-eco-card {
  padding: 1.6rem 1.6rem 1.4rem;
  background: var(--lp-bg-card);
  border: 1px solid var(--lp-line);
  border-radius: 18px;
  transition:
    border-color 0.18s,
    transform 0.18s;
}
.lp-eco-card:hover {
  border-color: var(--lp-line-2);
  transform: translateY(-2px);
}
@media (prefers-reduced-motion: reduce) {
  .lp-eco-card { transition: none; }
  .lp-eco-card:hover { transform: none; }
}
.lp-eco-name {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 1.45rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-top: 0.5rem;
  margin-bottom: 0;
}
.lp-eco-kind {
  font-family: 'Geist Mono', monospace;
  font-size: 0.72rem;
  color: var(--lp-text-3);
  text-transform: uppercase;
  letter-spacing: 0.14em;
}
.lp-eco-meta {
  color: var(--lp-text-2);
  font-size: 0.92rem;
  margin-top: 0.9rem;
  max-width: 42ch;
}

.lp-eco-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.lp-eco-chip {
  padding: 0.45rem 0.95rem;
  background: var(--lp-bg-card);
  border: 1px solid var(--lp-line);
  border-radius: 999px;
  font-size: 0.85rem;
  color: var(--lp-text-2);
  transition: border-color 0.18s, color 0.18s;
}
.lp-eco-chip:hover {
  border-color: var(--lp-line-2);
  color: var(--lp-text);
}

/* ── Capabilities ── */
.lp-cap-heading { margin-block: 1rem 3rem; }
.lp-cap {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(2rem, 5vw, 4rem);
  align-items: center;
  margin-bottom: clamp(3rem, 6vw, 5.5rem);
}
@media (max-width: 880px) {
  .lp-cap { grid-template-columns: 1fr; }
}
.lp-cap-flip > :first-child { order: 2; }
@media (max-width: 880px) {
  .lp-cap-flip > :first-child { order: 0; }
}
.lp-cap-title {
  font-size: clamp(1.6rem, 2.6vw, 2.2rem);
  margin-block: 1rem 0.9rem;
  max-width: 18ch;
}
.lp-cap p { max-width: 40ch; font-size: 1.01rem; }
.lp-cap-footer {
  max-width: 50ch;
  color: var(--lp-text-3);
  font-size: 0.92rem;
  margin-top: 1rem;
}
.lp-inline-link {
  color: var(--lp-violet);
  text-decoration: none;
  border-bottom: 1px solid rgba(131, 110, 249, 0.4);
  transition: border-color 0.18s, color 0.18s;
}
.lp-inline-link:hover {
  color: #c2b4ff;
  border-bottom-color: var(--lp-violet);
}

/* ── Capability mini-mocks ── */
.lp-cmock {
  position: relative;
  aspect-ratio: 4 / 3;
  background: linear-gradient(140deg, var(--lp-bg-card-2) 0%, var(--lp-bg-card) 100%);
  border: 1px solid var(--lp-line-2);
  border-radius: 18px;
  padding: 1.4rem;
  overflow: hidden;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.04) inset,
    0 24px 60px -32px rgba(0, 0, 0, 0.7);
  font-family: 'Geist', system-ui, sans-serif;
}
.lp-cmock-eyebrow {
  display: inline-flex;
  align-items: center;
  font-family: 'Geist Mono', ui-monospace, monospace;
  font-size: 0.7rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--lp-text-3);
}
.lp-cmock-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.4rem;
}
.lp-cmock-big {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: clamp(1.45rem, 2.4vw, 1.85rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-top: 0.2rem;
  line-height: 1;
}
.lp-cmock-pill {
  padding: 0.2rem 0.55rem;
  font-family: 'Geist Mono', monospace;
  font-size: 0.72rem;
  border-radius: 999px;
}
.lp-cmock-pill-up {
  background: rgba(16, 185, 129, 0.12);
  color: var(--lp-accent-pos);
}
.lp-cmock-spark {
  display: block;
  width: 100%;
  height: 60px;
  margin-block: 0.8rem;
}
.lp-cmock-rows {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.lp-cmock-row {
  display: grid;
  grid-template-columns: 18px 1fr auto;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.76rem;
}
.lp-cmock-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: linear-gradient(135deg, #836ef9, #4c1d95);
}
.lp-cmock-sym {
  display: flex;
  gap: 0.4rem;
  color: var(--lp-text);
}
.lp-cmock-sym strong { font-weight: 550; }
.lp-cmock-name { color: var(--lp-text-3); }
.lp-cmock-val {
  font-family: 'Geist Mono', monospace;
  color: var(--lp-text-2);
}

.lp-cmock-yrows {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  margin-top: 0.8rem;
}
.lp-cmock-yrow {
  display: grid;
  grid-template-columns: 1.4fr 1fr auto;
  gap: 0.7rem;
  align-items: center;
  padding: 0.5rem 0.6rem;
  border-radius: 9px;
  font-size: 0.78rem;
}
.lp-cmock-yrow-top {
  background: rgba(131, 110, 249, 0.08);
  border: 1px solid rgba(131, 110, 249, 0.18);
}
.lp-cmock-yp {
  font-weight: 550;
  color: var(--lp-text);
}
.lp-cmock-yt {
  color: var(--lp-text-3);
  font-size: 0.72rem;
  margin-top: 0.05rem;
}
.lp-cmock-ytvl {
  font-family: 'Geist Mono', monospace;
  color: var(--lp-text-3);
  font-size: 0.72rem;
}
.lp-cmock-yapr {
  font-family: 'Geist Mono', monospace;
  font-weight: 550;
  color: var(--lp-text-2);
}
.lp-cmock-yapr-top { color: #c2b4ff; }

.lp-cmock-swap-in,
.lp-cmock-swap-out {
  margin-top: 0.4rem;
  padding: 0.85rem 1rem;
  background: rgba(131, 110, 249, 0.07);
  border: 1px solid var(--lp-line);
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.lp-cmock-swap-out { background: rgba(131, 110, 249, 0.04); }
.lp-cmock-swap-amt {
  font-family: 'Bricolage Grotesque', sans-serif;
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.lp-cmock-swap-chain {
  font-family: 'Geist Mono', monospace;
  font-size: 0.74rem;
  color: var(--lp-text-3);
}
.lp-cmock-swap-arrow {
  display: flex;
  justify-content: center;
  margin: 0.45rem 0;
  color: var(--lp-violet);
}
.lp-cmock-swap-meta {
  margin-top: 0.9rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  font-family: 'Geist Mono', monospace;
  font-size: 0.72rem;
  color: var(--lp-text-3);
}
.lp-cmock-swap-sep { color: var(--lp-line-2); }

/* ── Trust ── */
.lp-trust {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.4rem;
  padding-block: clamp(3rem, 5vw, 4rem);
  border-top: 1px solid var(--lp-line);
  border-bottom: 1px solid var(--lp-line);
}
@media (max-width: 760px) {
  .lp-trust { grid-template-columns: repeat(2, 1fr); }
}
.lp-trust-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}
.lp-trust-icon {
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: rgba(131, 110, 249, 0.12);
  color: var(--lp-violet);
}
.lp-trust-title {
  font-weight: 550;
  font-size: 0.95rem;
  color: var(--lp-text);
}
.lp-trust-sub {
  color: var(--lp-text-3);
  font-size: 0.82rem;
  margin-top: 0.15rem;
}

/* ── Final CTA ── */
.lp-final {
  position: relative;
  text-align: center;
  padding: clamp(5rem, 10vw, 8rem) clamp(1.25rem, 4vw, 2.5rem);
  overflow: hidden;
}
.lp-final-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 70% 65% at 50% 55%, rgba(131, 110, 249, 0.22) 0%, transparent 60%),
    radial-gradient(ellipse 100% 50% at 50% 100%, rgba(76, 29, 149, 0.25) 0%, transparent 70%);
}
.lp-final-h {
  font-size: clamp(2.2rem, 4.2vw, 3.2rem);
  max-width: 14ch;
  margin: 1rem auto 0;
}
.lp-final-sub {
  margin: 1rem auto 2.2rem;
  max-width: 36ch;
  font-size: 1rem;
}
.lp-final-cta { position: relative; }

/* ── Footer ── */
.lp-footer {
  text-align: center;
  padding: 2.4rem 1.5rem 2.6rem;
  color: var(--lp-text-3);
  font-size: 0.86rem;
}
.lp-footer a {
  color: var(--lp-text-2);
  text-decoration: none;
  transition: color 0.18s;
}
.lp-footer a:hover { color: var(--lp-violet); }
.lp-footer .lp-foot-sep { color: var(--lp-line-2); margin-inline: 0.45rem; }

/* ── Hide body theming on this page (landing is always dark) ── */
.lp-root { color-scheme: dark; }

/* ── Ink-wash transition (LaunchButton overdrive) ── */
.lp-launching {
  pointer-events: none;
}
.lp-launching::after {
  content: '';
  position: fixed;
  inset: 0;
  background: var(--lp-violet-2);
  z-index: 9999;
  pointer-events: none;
  clip-path: circle(0% at var(--lp-ink-x, 50%) var(--lp-ink-y, 50%));
  animation: lp-ink-wash 520ms cubic-bezier(0.65, 0, 0.35, 1) forwards;
  will-change: clip-path;
}
@keyframes lp-ink-wash {
  0%   { clip-path: circle(0%   at var(--lp-ink-x, 50%) var(--lp-ink-y, 50%)); }
  100% { clip-path: circle(150% at var(--lp-ink-x, 50%) var(--lp-ink-y, 50%)); }
}
@media (prefers-reduced-motion: reduce) {
  .lp-launching::after { animation: none; display: none; }
}
`
