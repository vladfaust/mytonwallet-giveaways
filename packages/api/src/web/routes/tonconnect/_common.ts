export function redisProofKey(nonce: string) {
  return `tonconnect:payload:${nonce}`;
}
