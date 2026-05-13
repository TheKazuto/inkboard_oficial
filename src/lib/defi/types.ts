/**
 * defi/types.ts — shared types for DeFi protocol integrations.
 *
 * `DefiPosition` mirrors the type exposed by PortfolioContext and the
 * /api/defi response envelope. Keep these in sync if you change the API.
 */

export interface DefiSupplyEntry {
  symbol:    string
  amount:    number
  amountUSD: number
  apy:       number
}

export interface DefiBorrowEntry {
  symbol:    string
  amount:    number
  amountUSD: number
  apr?:      number
}

export type DefiPositionType = 'lending' | 'pool' | 'vault' | 'liquidity'

export interface DefiPosition {
  protocol:            string
  type:                DefiPositionType
  logo:                string
  url:                 string
  chain:               string
  label:               string
  tokens?:             string[]
  amountUSD?:          number
  netValueUSD:         number
  apy?:                number
  inRange?:            boolean | null
  supply?:             DefiSupplyEntry[]
  collateral?:         DefiSupplyEntry[]
  borrow?:             DefiBorrowEntry[]
  totalCollateralUSD?: number
  totalDebtUSD?:       number
  healthFactor?:       number | null
}

/** vfat.io farm response — partial, only the fields we read. */
export interface VfatFarm {
  type?:     string
  pool?:     {
    address?:    string
    name?:       string
    underlying?: { symbol?: string; stakedReserve?: string; dailySwapFees?: string }[]
  }
  rewards?: {
    rewardsPerSecond?: string
    rewardToken?:      { symbol?: string; price?: number }
  }[]
}

/** Curve pool shape from api-core.curve.finance — partial. */
export interface CurvePool {
  id?:                         string
  address:                     string
  name?:                       string
  lpTokenAddress?:             string
  totalSupply?:                string
  lpTokenPrice?:               number
  usdTotal?:                   number
  usdTotalExcludingBasePool?:  number
  coins?:                      { symbol: string; decimals: number }[]
}

/** GeckoTerminal pool shape — partial. */
export interface GeckoPool {
  attributes?: {
    address?:        string
    name?:           string
    reserve_in_usd?: string
  }
  relationships?: {
    base_token?:  { data?: { id?: string } }
    quote_token?: { data?: { id?: string } }
  }
}

/** InkySwap pair API shape — partial. */
export interface InkyPair {
  pair_address?:  string
  address?:       string
  liquidity_usd?: string | number
  tvl?:           string | number
  apr?:           string | number
  token0?:        { symbol?: string }
  token1?:        { symbol?: string }
}
