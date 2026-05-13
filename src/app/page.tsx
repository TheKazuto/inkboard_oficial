import Link from 'next/link'
import {
  ArrowRight,
  Activity,
  Shield,
  Network,
  Sparkles,
} from 'lucide-react'

import Reveal from '@/components/landing/Reveal'
import HeroDashboardMock from '@/components/landing/HeroDashboardMock'
import LiveAprStrip from '@/components/landing/LiveAprStrip'
import LaunchButton from '@/components/landing/LaunchButton'
import { CapabilityMock } from '@/components/landing/CapabilityMock'
import { LANDING_CSS } from '@/components/landing/landing-css'

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
    title:   'Every position you hold on Ink, in one view.',
    body:    'Tokens, NFTs, lending balances, liquidity. Aggregated and priced in real time. Read-only by default; nothing leaves your wallet.',
    mock:    'portfolio' as const,
  },
  {
    eyebrow: '02 · Yields',
    title:   'The best APR on Ink, refreshed every minute.',
    body:    'Velodrome, InkySwap, Tydro, Nado, Curve. Real APR, real TVL, ranked. No inflated reward math.',
    mock:    'yields' as const,
  },
  {
    eyebrow: '03 · Swap & bridge',
    title:   'Route across 70+ chains via LI.FI.',
    body:    'Best route from 360+ DEXes and bridges, quoted server-side. Sign in your wallet, watch the status, done.',
    mock:    'swap' as const,
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
                  <span><strong>5+</strong>&nbsp;protocols</span>
                  <span className="lp-pillsep">·</span>
                  <span><strong>70+</strong>&nbsp;chains for swap</span>
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
          <section className="lp-section lp-section-tight" aria-label="Live yield on Ink">
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
                {ECOSYSTEM_SECONDARY.map(p => (
                  <span key={p} className="lp-eco-chip">{p}</span>
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
                <Link href="/security" className="lp-inline-link">Security</Link>{' '}
                and{' '}
                <Link href="/transactions" className="lp-inline-link">Transactions</Link>.
              </p>
            </Reveal>
          </section>

          {/* ── Trust line ── */}
          <div className="lp-section lp-section-tight" aria-label="Trust">
            <Reveal>
              <div className="lp-trust">
                <TrustItem icon={<Sparkles size={18} aria-hidden />} title="Built by Shinka Labs" sub="DeFi engineering studio" />
                <TrustItem icon={<Network  size={18} aria-hidden />} title="Powered by Ink Network" sub="Chain ID 57073" />
                <TrustItem icon={<Shield   size={18} aria-hidden />} title="Custody-free" sub="Read-only by default" />
                <TrustItem icon={<Activity size={18} aria-hidden />} title="Live data" sub="Refreshed every minute" />
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
            <a href="https://www.shinkalabs.tech/" target="_blank" rel="noopener noreferrer">Shinka Labs</a>
            <span className="lp-foot-sep">·</span>InkBoard
            <span className="lp-foot-sep">·</span>
            <a href="https://t.me/ShinkaLabs" target="_blank" rel="noopener noreferrer">Telegram</a>
            <span className="lp-foot-sep">·</span>
            <a href="https://x.com/XShinkaLabsX" target="_blank" rel="noopener noreferrer">Twitter</a>
            <span className="lp-foot-sep">·</span>
            <a href="https://discord.gg/n6V8WV5ZN4" target="_blank" rel="noopener noreferrer">Discord</a>
          </footer>
        </div>
      </div>
    </>
  )
}

function TrustItem({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="lp-trust-item">
      <div className="lp-trust-icon">{icon}</div>
      <div>
        <div className="lp-trust-title">{title}</div>
        <div className="lp-trust-sub">{sub}</div>
      </div>
    </div>
  )
}
