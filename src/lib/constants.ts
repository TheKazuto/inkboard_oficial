/**
 * constants.ts — shared timing and limit constants.
 *
 * Keep timeouts documented and centralized so we tune them in one place.
 */

export const TIMEOUT = {
  FAST:   8_000,    // Blockscout, OpenSea floor stats
  NORMAL: 12_000,   // vfat, DefiLlama, Merkl, on-chain batches
  SLOW:   15_000,   // Heavy RPC batches, top-level upstream
  LIFI:   30_000,   // LI.FI quote (multi-bridge calc)
} as const

export const RPC = {
  BATCH_CHUNK:  20, // Max calls per batch chunk in nfts/route
  MAX_RESERVES: 50, // Tydro reserves cap (sanity)
} as const

export const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/
export const TX_HASH_RE     = /^0x[a-fA-F0-9]{64}$/
export const CHAIN_ID_RE    = /^\d+$/
export const COIN_ID_RE     = /^[a-z0-9-]+$/
