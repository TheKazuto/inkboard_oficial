/**
 * swap/types.ts — LI.FI quote/chain/token shapes shared by the swap UI.
 */

export interface LifiChain {
  id:        number
  key:       string
  name:      string
  chainType: string
  coin:      string
  logoURI:   string
  nativeToken: LifiToken
  metamask?: {
    blockExplorerUrls: string[]
    rpcUrls:           string[]
    chainName:         string
  }
}

export interface LifiToken {
  address:   string
  symbol:    string
  name:      string
  decimals:  number
  chainId?:  number
  logoURI:   string
  priceUSD?: string
  coinKey?:  string
}

export interface LifiQuote {
  id:   string
  type: string
  tool: string
  toolDetails?: { key: string; name: string; logoURI: string }
  action: {
    fromChainId: number
    toChainId:   number
    fromToken:   LifiToken
    toToken:     LifiToken
    fromAmount:  string
    slippage:    number
    toAddress?:  string
  }
  estimate: {
    fromAmount:        string
    toAmount:          string
    toAmountMin:       string
    approvalAddress?:  string
    executionDuration: number
    gasCosts?:         { amountUSD: string }[]
    feeCosts?:         { amountUSD: string; name: string }[]
    fromAmountUSD?:    string
    toAmountUSD?:      string
  }
  transactionRequest?: {
    from:      string
    to:        string
    data:      string
    value:     string
    gasLimit?: string
    gasPrice?: string
    chainId?:  number
  }
  includedSteps?: {
    type: string
    tool: string
    toolDetails?: { name: string }
    estimate?: { executionDuration: number }
  }[]
}

export type TxStatus =
  | 'idle'
  | 'approving'
  | 'waitingApproval'
  | 'swapping'
  | 'pending'
  | 'success'
  | 'error'
