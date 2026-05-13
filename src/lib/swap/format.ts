/**
 * swap/format.ts — precise human/wei conversion using string math.
 * Avoids parseFloat precision loss for 18-decimal tokens.
 */

export function humanToWei(humanAmount: string, decimals: number): bigint {
  if (!humanAmount || humanAmount === '0') return 0n
  const trimmed = humanAmount.trim()
  const parts = trimmed.split('.')
  const intPart = parts[0] || '0'
  let fracPart = parts[1] || ''

  if (fracPart.length > decimals) {
    fracPart = fracPart.slice(0, decimals)
  } else {
    fracPart = fracPart.padEnd(decimals, '0')
  }

  const combined = intPart + fracPart
  const cleaned  = combined.replace(/^0+/, '') || '0'
  return BigInt(cleaned)
}

export function weiToHuman(weiStr: string, decimals: number, maxFrac = 8): string {
  if (weiStr === '0') return '0'
  const padded   = weiStr.padStart(decimals + 1, '0')
  const intPart  = padded.slice(0, padded.length - decimals) || '0'
  const fracPart = padded.slice(padded.length - decimals)
  const capped   = fracPart.slice(0, maxFrac)
  const trimmed  = capped.replace(/0+$/, '')
  return trimmed ? `${intPart}.${trimmed}` : intPart
}
