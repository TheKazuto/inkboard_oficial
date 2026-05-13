// MCP Server for InkBoard — HTTP-based Model Context Protocol endpoint
// Allows AI agents to discover and use InkBoard's DeFi data tools

import { NextRequest, NextResponse } from 'next/server'

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/
const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://inkboard.pro'

async function fetchApi(path: string, params?: Record<string, string>) {
  const url = new URL(`/api${path}`, BASE)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(30_000),
    headers: { 'Accept': 'application/json' },
  })
  if (!res.ok) throw new Error(`API ${path} returned ${res.status}`)
  return res.json()
}

const TOOLS = [
  {
    name: 'get_portfolio',
    description: 'Get complete portfolio overview for an Ink Network address: tokens, NFTs, DeFi positions, and total value in USD',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$', description: 'EVM wallet address' },
      },
      required: ['address'],
    },
  },
  {
    name: 'get_best_aprs',
    description: 'Get aggregated best APRs from all Ink ecosystem protocols (Velodrome, InkySwap, Tydro, Nado, Curve). Sorted by APR.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_defi_positions',
    description: 'Get active DeFi positions for an address across all Ink protocols: liquidity pools, lending, vaults',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$', description: 'EVM wallet address' },
      },
      required: ['address'],
    },
  },
  {
    name: 'get_token_prices',
    description: 'Get current ETH price and exchange rates for Ink ecosystem tokens',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_transactions',
    description: 'Get classified transaction history for an address on Ink Network: swaps, sends, DeFi, NFT mints',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$', description: 'EVM wallet address' },
      },
      required: ['address'],
    },
  },
  {
    name: 'get_nfts',
    description: 'Get NFT holdings for an address on Ink Network with metadata and estimated values',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$', description: 'EVM wallet address' },
      },
      required: ['address'],
    },
  },
  {
    name: 'scan_approvals',
    description: 'Scan ERC20 token approvals (allowances) for an address on Ink Network. Returns all approvals that could pose security risks',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$', description: 'EVM wallet address' },
        chainId: { type: 'integer', default: 57073, description: 'Chain ID (default: 57073 for Ink)' },
      },
      required: ['address'],
    },
  },
  {
    name: 'get_fear_greed',
    description: 'Get current Crypto Fear & Greed Index value and classification',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'lifi_quote',
    description: 'Get cross-chain swap quote via LI.FI. Supports 70+ chains and 360+ DEXes',
    inputSchema: {
      type: 'object',
      properties: {
        fromChain: { type: 'integer', description: 'Source chain ID' },
        toChain: { type: 'integer', description: 'Destination chain ID' },
        fromToken: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$', description: 'Source token address' },
        toToken: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$', description: 'Destination token address' },
        fromAmount: { type: 'string', pattern: '^\\d+$', description: 'Amount in smallest unit (wei)' },
        slippage: { type: 'number', minimum: 0, maximum: 0.5, default: 0.01 },
      },
      required: ['fromChain', 'fromToken', 'fromAmount'],
    },
  },
  {
    name: 'lifi_tokens',
    description: 'Get list of tokens supported by LI.FI on a specific chain',
    inputSchema: {
      type: 'object',
      properties: {
        chain: { type: 'integer', description: 'Chain ID' },
      },
      required: ['chain'],
    },
  },
  {
    name: 'lifi_chains',
    description: 'Get list of all chains supported by LI.FI for cross-chain swaps',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
]

async function handleToolCall(name: string, args: Record<string, unknown>) {
  switch (name) {
    case 'get_portfolio': {
      const address = args.address as string
      if (!EVM_ADDRESS_RE.test(address)) return { error: 'Invalid address format' }
      const [tokens, defi, nfts] = await Promise.all([
        fetchApi('/token-exposure', { address }),
        fetchApi('/defi', { address }),
        fetchApi('/nfts', { address }),
      ])
      const tokenValue = tokens?.totalValueUSD ?? 0
      const defiValue = defi?.totalValueUSD ?? 0
      const nftValue = nfts?.totalValueUSD ?? 0
      return {
        address,
        totalValueUSD: tokenValue + defiValue + nftValue,
        breakdown: { tokens: tokenValue, defi: defiValue, nfts: nftValue },
        tokens: tokens?.tokens ?? [],
        defiPositions: defi?.positions ?? [],
        nfts: nfts?.nfts ?? [],
      }
    }

    case 'get_best_aprs': {
      return fetchApi('/best-aprs')
    }

    case 'get_defi_positions': {
      const address = args.address as string
      if (!EVM_ADDRESS_RE.test(address)) return { error: 'Invalid address format' }
      return fetchApi('/defi', { address })
    }

    case 'get_token_prices': {
      const [eth, rates] = await Promise.all([
        fetchApi('/eth-price'),
        fetchApi('/exchange-rates'),
      ])
      return { eth, exchangeRates: rates }
    }

    case 'get_transactions': {
      const address = args.address as string
      if (!EVM_ADDRESS_RE.test(address)) return { error: 'Invalid address format' }
      return fetchApi('/transactions', { address })
    }

    case 'get_nfts': {
      const address = args.address as string
      if (!EVM_ADDRESS_RE.test(address)) return { error: 'Invalid address format' }
      return fetchApi('/nfts', { address })
    }

    case 'scan_approvals': {
      const address = args.address as string
      if (!EVM_ADDRESS_RE.test(address)) return { error: 'Invalid address format' }
      const chainId = String(args.chainId ?? 57073)
      return fetchApi('/approvals-logs', {
        address,
        chainId,
        topic0: '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925',
        fromBlock: '0',
        toBlock: 'latest',
      })
    }

    case 'get_fear_greed': {
      return fetchApi('/fear-greed')
    }

    case 'lifi_quote': {
      const params: Record<string, string> = {}
      if (args.fromChain) params.fromChain = String(args.fromChain)
      if (args.toChain) params.toChain = String(args.toChain)
      if (args.fromToken) params.fromToken = String(args.fromToken)
      if (args.toToken) params.toToken = String(args.toToken)
      if (args.fromAmount) params.fromAmount = String(args.fromAmount)
      if (args.slippage) params.slippage = String(args.slippage)
      return fetchApi('/lifi-quote', params)
    }

    case 'lifi_tokens': {
      if (!args.chain) return { error: 'chain parameter required' }
      return fetchApi('/lifi-tokens', { chain: String(args.chain) })
    }

    case 'lifi_chains': {
      return fetchApi('/lifi-chains')
    }

    default:
      return { error: `Unknown tool: ${name}` }
  }
}

export async function GET() {
  return NextResponse.json({
    protocol: 'mcp',
    version: '0.2.0',
    name: 'InkBoard',
    description: 'DeFi dashboard for Ink Network — portfolio tracking, yield aggregation, security scanning, cross-chain swaps',
    capabilities: { tools: true, resources: false, prompts: false },
    tools: TOOLS,
    endpoints: {
      call: '/api/mcp',
      openapi: '/api/openapi.yaml',
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { method, params } = body

    if (method === 'tools/list') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id: body.id ?? null,
        result: { tools: TOOLS },
      })
    }

    if (method === 'tools/call') {
      const { name, arguments: args } = params ?? {}
      if (!name) {
        return NextResponse.json({
          jsonrpc: '2.0',
          id: body.id ?? null,
          error: { code: -32602, message: 'Missing tool name' },
        }, { status: 400 })
      }

      const result = await handleToolCall(name, args ?? {})
      return NextResponse.json({
        jsonrpc: '2.0',
        id: body.id ?? null,
        result: {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        },
      })
    }

    if (method === 'initialize') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id: body.id ?? null,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'InkBoard', version: '0.2.0' },
        },
      })
    }

    return NextResponse.json({
      jsonrpc: '2.0',
      id: body.id ?? null,
      error: { code: -32601, message: `Method not found: ${method}` },
    }, { status: 404 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32603, message },
    }, { status: 500 })
  }
}
