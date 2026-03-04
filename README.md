# Ink Board 🟣

> The ultimate portfolio dashboard for the Ink ecosystem.

InkBoard is a central dashboard for Ink users to track their wallet, DeFi positions, NFTs, and transaction history in real-time. Built with Next.js, deployed on Vercel.

---

## Features

- **Portfolio Overview** — Total wallet value in USD (tokens + NFTs), 24h change
- **Token Allocation** — Pie chart with % exposure per token
- **DeFi Positions** — Active positions across Ink protocols (liquidity pools, lending, staking)
- **Transaction History** — Full history with filtering by type (receive, send, swap, DeFi, NFT)
- **Portfolio History Chart** — Up to 1 year of historical portfolio value
- **Top Ink Tokens** — Top 10 by market cap
- **Fear & Greed Index** — Crypto market sentiment
- **Wallet Monitoring** — Watch other wallets and track their activity *(NFT gated)*
- **Telegram Bot Alerts** — Real-time notifications for wallet activity *(NFT gated)*
- **NFT Gating System** — Unlock premium features by holding a InkBoard NFT
- **Sponsors Area** — Partner/sponsor banners
- **Mobile Responsive** — Works on all screen sizes

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + custom CSS variables
- **Charts:** Recharts
- **Wallet Connection:** RainbowKit + Wagmi + Viem
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Fonts:** Sora (display) + DM Sans (body)

---

## APIs (to integrate)

| Data | API |
|------|-----|
| Token prices & market data | [CoinGecko API](https://www.coingecko.com/api) |
| NFT floor prices & metadata | [Opensea API](https://docs.opensea.io/reference/api-overview) |
| On-chain data (balances, txs) | Ink RPC |
| Fear & Greed Index | [CryptoRank](https://cryptorank.io/charts/fear-and-greed) |

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm / yarn / pnpm

### Installation

```bash
git clone https://github.com/yourusername/inkboard_oficial.git
cd inkboard_oficial
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Environment Variables

Create a `.env.local` file:

```env
# CoinGecko API
COINGECKO_API_KEY=your_key_here

# OPENSEA API
OPENSEA_API_KEY=your_key_here

# Ink RPC
NEXT_PUBLIC_INK_RPC_URL=https://rpc-gel.inkonchain.com

# InkBoard NFT Contract (fill when collection launches)
NEXT_PUBLIC_INKBOARD_NFT_CONTRACT=0x...

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_token_here
```

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Dashboard (home)
│   ├── portfolio/page.tsx    # Full token + NFT portfolio
│   ├── defi/page.tsx         # DeFi positions
│   ├── transactions/page.tsx # Transaction history + wallet monitor
│   ├── account/page.tsx      # User settings + NFT status
│   ├── layout.tsx            # Root layout (Navbar + BottomBar)
│   └── globals.css           # Global styles + design tokens
├── components/
│   ├── Navbar.tsx            # Top navigation + wallet connect
│   └── BottomBar.tsx         # Fixed bottom bar (ETH price + socials)
└── lib/
    └── mockData.ts           # Mock data (replace with real API calls)
```

---

## Deploying to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repo
3. Add environment variables in Vercel dashboard
4. Deploy!

---

## Roadmap

- [ ] Real wallet integration (RainbowKit)
- [ ] Live CoinGecko API integration
- [ ] Opensea NFT API integration
- [ ] Ink RPC on-chain data
- [ ] Telegram bot backend (Railway/Render)
- [ ] NFT contract gating (when collection launches)
- [ ] More DeFi protocol integrations
- [ ] Multi-wallet support
- [ ] Portfolio export (CSV/PDF)

---

## License

MIT — Built for the Ink ecosystem 🟣
