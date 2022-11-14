/**
 * Cryptographic primitives used for protocol encryption, signing, and signature verification.
 *
 * @module
 */

export * from "./aes.ts";
export * from "./rsa.ts";

/**
 * Generates a hash used for authentication via the Mojang session services.
 */
export async function hashServerId(
  serverId: Uint8Array,
  secret: Uint8Array,
  publicKey: Uint8Array,
): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-1",
    new Uint8Array([...serverId, ...secret, ...publicKey]),
  );
  return BigInt.asIntN(
    160,
    new Uint8Array(hash).reduce((a, x) => a << 8n | BigInt(x), 0n),
  ).toString(16);
}
