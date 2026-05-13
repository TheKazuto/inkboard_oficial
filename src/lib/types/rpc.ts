/**
 * rpc.ts — JSON-RPC response shapes for Ink chain calls.
 */

export interface JsonRpcResult {
  jsonrpc: '2.0'
  id:      number | string
  result?: string
  error?:  { code: number; message: string }
}

export type RpcBatchResult = JsonRpcResult[]

/** Helper: find a result by id with proper typing. */
export function findById(results: RpcBatchResult, id: number | string): JsonRpcResult | undefined {
  return results.find(r => r.id === id)
}

/** Helper: get the hex result string by id, or '0x' if missing. */
export function resultHex(results: RpcBatchResult, id: number | string): string {
  return findById(results, id)?.result ?? '0x'
}
