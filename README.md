# InkBoard

> The DeFi dashboard for Ink Network — custody-free, real-time, built on the edge.

InkBoard tracks your tokens, NFTs, DeFi positions, yields and on-chain activity across the [Ink Network](https://inkonchain.com) ecosystem (chainId `57073`). Everything is read-only — the server never holds your keys or signs in your name. Cross-chain swaps route through LI.FI and are always signed in your wallet.

Live at **[inkboard.pro](https://inkboard.pro)**.

---

## Features

- **Portfolio overview** — Total wallet value in USD (tokens + NFTs + DeFi), with token allocation pie chart and 1-year historical chart.
- **DeFi positions** — Native integration with five Ink protocols: **Tydro** (Aave V3 fork lending), **Velodrome** (LP + gauges), **InkySwap** (AMM LP), **Curve** (LP with realised APR from on-chain logs), **Nado** (NLP Vault via subaccount API). Net value, supply/borrow breakdown and health factor when relevant.
- **Best APRs** — Aggregated, ranked yields across Velodrome, InkySwap, Tydro (+ Merkl incentive overlay), Nado and Curve. Pulled live from vfat, DefiLlama, on-chain RAY rates and the Nado archive.
- **Cross-chain swap & bridge** — Quotes through [LI.FI](https://li.fi) across 70+ chains and 360+ DEXes. Backend only proxies `/quote` and `/status`; the transaction itself is always signed client-side in your wallet.
- **Security / approval scanner** — Scans ERC-20 approvals on Ink and lets you revoke risky allowances in one click.
- **Transactions** — Blockscout-backed history with native + ERC-20 transfers, classified by direction (send/receive) and source (RPC fallback when Blockscout is unavailable).
- **NFT inventory** — OpenSea primary path with collection floor prices in USD; Blockscout + on-chain `tokenURI` fallback when no API key is configured. All metadata is sanitized before render.
- **Market context** — Top Ink tokens by market cap, top 24h gainers from GeckoTerminal, Fear & Greed Index, USD/EUR/BRL exchange rates.
- **MCP server** — `/api/mcp` exposes InkBoard's read-only tools (portfolio, APRs, NFTs, approvals, swap quotes) as a Model Context Protocol endpoint for AI agents.

---

## Tech Stack

| Layer            | Choice                                                          |
|------------------|-----------------------------------------------------------------|
| Framework        | Next.js 16 (App Router, Turbopack) + React 19 + TypeScript 5    |
| Styling          | Tailwind CSS 4 + scoped CSS for the landing                     |
| Charts           | Recharts                                                        |
| Wallet           | RainbowKit + Wagmi + Viem                                       |
| Animations       | Framer Motion (respects `prefers-reduced-motion`)               |
| Icons            | Lucide React                                                    |
| Display font     | Plus Jakarta Sans (app) · Bricolage Grotesque + Geist (landing) |
| Deploy           | Cloudflare Workers via [@opennextjs/cloudflare](https://opennext.js.org/cloudflare) |
| Cache & rate-limit | Cloudflare KV (binding `CACHE_KV`)                            |

---

## External services

| Data                       | Provider                                         |
|----------------------------|--------------------------------------------------|
| Token & ETH prices         | CoinGecko (`/simple/price`, `/market_chart`)     |
| NFT floors & metadata      | OpenSea v2 (primary), Blockscout + RPC (fallback) |
| On-chain reads             | Ink RPC (`rpc-gel`, with `rpc-qnd` failover)     |
| Velodrome farms            | vfat.io aggregator                               |
| Tydro lending incentives   | Merkl                                            |
| Curve pools                | api-core.curve.finance                           |
| InkySwap pools             | inkyswap.com/api                                 |
| Nado NLP Vault             | gateway.prod.nado.xyz, archive.prod.nado.xyz     |
| Cross-chain swap quotes    | LI.FI (`/quote`, `/status`)                      |
| Block explorer             | Blockscout (`explorer.inkonchain.com`)           |
| Exchange rates             | open.er-api.com                                  |
| Fear & Greed Index         | alternative.me                                   |
| Top tokens / gainers       | CoinGecko + GeckoTerminal                        |

---

## Security model

- **Read-only by default.** No private key, seed phrase or signed payload is ever stored or seen by the server.
- **LI.FI proxies** validate `fromChain`, `toChain`, `fromToken`, `toToken`, `fromAmount`, `slippage` (0–0.5), `fromAddress`, `toAddress` and `txHash` before forwarding. The quote's transaction is signed entirely on the client.
- **Strict CSP** with an explicit `connect-src` allowlist (Ink RPCs, CoinGecko, LI.FI, OpenSea, etc.). `unsafe-eval` is disabled, `unsafe-inline` retained only for the pre-hydration theme script.
- **Rate limiting** in `src/middleware.ts`, KV-backed, keyed by `cf-connecting-ip`. Limits per route: `scan-protocol` 5/min, `nfts`/`approvals-logs` 10/min, `best-aprs` 12/min, `defi` 15/min, `transactions`/`portfolio-history` 20/min, `token-exposure` 30/min, default 60/min.
- **SSRF protection** in `/api/scan-protocol` (domain allowlist) and `/api/nfts` (HTTPS-only + private IP filter for metadata).
- **Sanitization** of all third-party strings (NFT names, on-chain `symbol()`/`name()`) before rendering.
- **Centralised logging** (`lib/log.ts`) redacts wallet addresses from logs.
- **Secrets** (`COINGECKO_API_KEY`, `OPENSEA_API_KEY`) are server-only — never `NEXT_PUBLIC_*`.

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm
- A [CoinGecko API key](https://www.coingecko.com/en/api/pricing) (demo or pro) — recommended
- (Optional) An [OpenSea API key](https://docs.opensea.io/reference/api-keys) for richer NFT data
- (Optional) `wrangler` if you want to preview or deploy to Cloudflare Workers

### Install & run locally

```bash
git clone https://github.com/TheKazuto/InkBoard.git
cd InkBoard/Projeto
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Create `.dev.vars` (used by wrangler) or `.env.local` (Next dev):

```env
# Required (server-side only)
COINGECKO_API_KEY=your_demo_or_pro_key

# Optional — if absent the API falls back to the demo endpoint
COINGECKO_API_KEY_TYPE=demo            # or "pro"
COINGECKO_API_BASE_URL=                # override only if you proxy CoinGecko

# Optional — enables OpenSea path for NFTs (Blockscout fallback otherwise)
OPENSEA_API_KEY=your_opensea_key

# Optional — your LI.FI integrator id and fee bps
NEXT_PUBLIC_LIFI_INTEGRATOR=inkboard
NEXT_PUBLIC_LIFI_FEE=0.002
```

Never prefix secrets with `NEXT_PUBLIC_`. Only `NEXT_PUBLIC_LIFI_*` is safe to expose because LI.FI's integrator/fee are public values.

---

## Scripts

```bash
npm run dev            # Next dev server (Turbopack)
npm run build          # next build
npm run worker:build   # opennextjs-cloudflare build → .open-next/worker.js
npm run preview        # build + open a local Cloudflare preview
npm run worker:deploy  # opennextjs-cloudflare deploy (requires wrangler login)
npm run lint           # eslint
npm run cf-typegen     # regenerate cloudflare-env.d.ts from wrangler.jsonc
```

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                  # Landing
│   ├── dashboard/                # Main dashboard
│   ├── portfolio/                # Tokens + NFTs
│   ├── defi/                     # DeFi positions
│   ├── best-aprs/                # Ranked APRs
│   ├── swap/                     # Cross-chain swap UI
│   ├── security/                 # Approval scanner
│   ├── transactions/             # Tx history
│   ├── account/                  # Settings
│   ├── layout.tsx                # Root layout
│   └── api/                      # 19 route handlers
│       ├── defi/                 # Aggregates all DeFi protocols
│       ├── best-aprs/            # APR aggregator
│       ├── nfts/                 # OpenSea + Blockscout fallback
│       ├── token-exposure/       # Token balances
│       ├── portfolio-history/    # Historical portfolio value
│       ├── transactions/         # Blockscout + RPC fallback
│       ├── scan-protocol/        # SSRF-safe protocol introspection
│       ├── approvals-logs/       # ERC-20 Approval event scanner
│       ├── lifi-{quote,status,chains,tokens}/  # LI.FI proxies
│       ├── eth-price/            # ETH USD + 24h change
│       ├── exchange-rates/       # USD/EUR/BRL
│       ├── fear-greed/           # Sentiment index
│       ├── top-tokens/           # Top Ink tokens by mcap
│       ├── top-gainers/          # Top 24h gainers
│       ├── token-list/           # Cross-chain token lists for swap
│       └── mcp/                  # Model Context Protocol endpoint
├── components/
│   ├── landing/                  # Hero, LiveAprStrip, CapabilityMock, scoped CSS
│   ├── swap/                     # SlippageModal, ChainModal, TokenModal, Images
│   ├── AppShell, Navbar, BottomBar, Providers, WalletProvider
│   └── PortfolioHistory, TokenExposure, TopTokens, TopEarners,
│       RecentActivity, FearAndGreed, AdBanner
├── contexts/                     # WalletContext, PortfolioContext, PreferencesContext, TransactionContext
├── hooks/                        # useEthPrice
├── lib/
│   ├── ink.ts                    # Ink RPC + KNOWN_TOKENS + rpcBatch (with secondary failover)
│   ├── priceService.ts           # Shared CoinGecko cache (one fetch, all routes consume)
│   ├── kvCache.ts                # KV-backed cache + stale-while-revalidate helper
│   ├── log.ts                    # Centralised logger with PII redaction
│   ├── constants.ts              # TIMEOUT, regex constants
│   ├── validation.ts             # Dependency-free input validators
│   ├── dataCache.ts              # Client-only browser cache (guards against server import)
│   ├── format.ts, styles.ts
│   ├── types/rpc.ts              # JSON-RPC response shapes
│   ├── defi/                     # tydro, velodrome, inkyswap, curve, nado, utils, types
│   └── swap/                     # types, constants, format, api
└── middleware.ts                 # CSP + security headers + rate limit (KV-backed)
```

---

## Deploy to Cloudflare Workers

InkBoard ships as a Cloudflare Worker built by OpenNext.

1. Push to GitHub.
2. Create a KV namespace and update `wrangler.jsonc → kv_namespaces[0].id`.
3. Set secrets:

   ```bash
   npx wrangler secret put COINGECKO_API_KEY
   npx wrangler secret put OPENSEA_API_KEY   # optional
   ```

4. Build and deploy:

   ```bash
   npm run worker:build
   npm run worker:deploy
   ```

The Worker runtime is fully compatible with Node's `nodejs_compat` flag — no Node-only APIs (`fs`, `child_process`, etc.) are used in route handlers.

---

## Architecture notes

- **No module-level mutable state on the server.** Every Cloudflare Worker request may run in a different isolate, so shared state lives in KV (cache, rate limit) — never in `Map`/`let` at module scope.
- **Stale-while-revalidate** via `kvGetSWR(key, softTtl, hardTtl, fetcher)`. Soft TTL = data still fresh; hard TTL = KV expiry. On upstream failure the stale value is returned and the failure is logged.
- **RPC failover.** `rpcBatch()` in `lib/ink.ts` tries `rpc-gel.inkonchain.com`, then `rpc-qnd.inkonchain.com`. Used everywhere we make on-chain calls.
- **Strict input validation** via `lib/validation.ts` (`parseEvmAddress`, `parseTxHash`, `parseChainId`, regex constants) at every API route boundary.

---

## License

MIT — Built by [Shinka Labs](https://www.shinkalabs.tech/) for the Ink ecosystem.
