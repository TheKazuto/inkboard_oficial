/**
 * nado.ts — Nado NLP Vault position via the gateway subaccount_info API.
 * NLP tokens live inside Nado's subaccount system, not as ERC-20 in the wallet.
 */

import { NADO_LOGO } from '@/lib/ink'
import { log, redactError } from '@/lib/log'
import { TIMEOUT } from '@/lib/constants'
import type { DefiPosition } from './types'

const NADO_GATEWAY = 'https://gateway.prod.nado.xyz/v1'

interface SpotBalance { product_id?: number; balance?: { amount?: string } }
interface SpotProduct { product_id?: number; oracle_price_x18?: string }

export async function fetchNado(user: string): Promise<DefiPosition[]> {
  try {
    // Build subaccount: address (20 bytes) + "default" (12 bytes, hex-encoded)
    const addr = user.toLowerCase().replace('0x', '')
    const subaccount = '0x' + addr + '64656661756c740000000000'

    // POST avoids URL-encoding issues with H256 hex strings.
    // Accept-Encoding: gzip is required by Nado (otherwise 403).
    const headers = {
      'Content-Type':    'application/json',
      Accept:            'application/json',
      'Accept-Encoding': 'gzip, deflate, br',
    }

    const res = await fetch(`${NADO_GATEWAY}/query`, {
      method:  'POST',
      headers,
      signal:  AbortSignal.timeout(TIMEOUT.NORMAL),
      body:    JSON.stringify({ type: 'subaccount_info', subaccount }),
    })
    if (!res.ok) return []
    const json = await res.json()
    const subData = json?.data
    if (!subData?.exists) return []

    const spotBalances: SpotBalance[] = subData.spot_balances ?? []
    const spotProducts: SpotProduct[] = subData.spot_products ?? []

    let nlpAmount = 0n
    for (const sb of spotBalances) {
      if (sb.product_id === 11) {
        nlpAmount = BigInt(sb.balance?.amount ?? '0')
        break
      }
    }
    if (nlpAmount <= 0n) return []

    let nlpPrice = 1.0
    for (const sp of spotProducts) {
      if (sp.product_id === 11) {
        nlpPrice = parseFloat(sp.oracle_price_x18 ?? '0') / 1e18
        break
      }
    }

    const nlpTokens = Number(nlpAmount) / 1e18
    const usdValue  = nlpTokens * nlpPrice
    if (usdValue < 0.01) return []

    return [{
      protocol: 'Nado',
      type:     'vault',
      logo:     NADO_LOGO,
      url:      'https://app.nado.xyz/vault',
      chain:    'Ink',
      label:    'NLP Vault (USDT0)',
      tokens:   ['USDT0'],
      amountUSD: usdValue,
      apy: 0,
      netValueUSD: usdValue,
      inRange: null,
    }]
  } catch (e) {
    log.error('defi', 'Nado error', redactError(e))
    return []
  }
}
