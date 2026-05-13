/**
 * landing-css.ts — large scoped CSS string for the landing page.
 * Kept inline via dangerouslySetInnerHTML to avoid an extra round-trip,
 * but lives in its own module so app/page.tsx stays focused on JSX.
 */

export const LANDING_CSS = `
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
