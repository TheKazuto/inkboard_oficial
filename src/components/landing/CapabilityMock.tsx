import { Layers, Repeat } from 'lucide-react'

interface CapabilityMockProps {
  kind: 'portfolio' | 'yields' | 'swap'
}

export function CapabilityMock({ kind }: CapabilityMockProps) {
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
          ].map(t => (
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
      { p: 'Velodrome', t: 'USDC / USDT0',      apr: 24.1, tvl: '1.2M', top: true  },
      { p: 'Tydro',     t: 'USDe supply',       apr: 9.1,  tvl: '4.6M', top: false },
      { p: 'InkySwap',  t: 'WETH / USDC v3',    apr: 7.3,  tvl: '0.8M', top: false },
      { p: 'Curve',     t: '3pool',             apr: 4.2,  tvl: '2.1M', top: false },
    ]
    return (
      <div className="lp-cmock" role="img" aria-label="Best APRs preview">
        <div className="lp-cmock-eyebrow">
          <Layers size={12} aria-hidden style={{ marginRight: 4 }} /> Best APR · ranked
        </div>
        <div className="lp-cmock-yrows">
          {rows.map(r => (
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
