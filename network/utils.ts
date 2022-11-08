// import { RSA } from "https://deno.land/x/god_crypto@v1.4.10/rsa.ts";
import { RSA } from "https://raw.githubusercontent.com/janispritzkau/god_crypto/fix-rsa-decrypt-error/rsa.ts";

/**
 * Generates a hash used for authentication with the Mojang session server.
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

/**
 * Encrypts data with the public key using the RSA algorithm with PKCS1 padding.
 */
export async function publicEncrypt(
  publicKey: Uint8Array,
  data: Uint8Array,
): Promise<Uint8Array> {
  const rsa = new RSA(importRsaKey(publicKey, "PUBLIC"));
  return new Uint8Array((await rsa.encrypt(data, { padding: "pkcs1" })).buffer);
}

/**
 * Decrypts data with the private key using the RSA algorithm with PKCS1 padding.
 */
export async function privateDecrypt(
  privateKey: Uint8Array,
  data: Uint8Array,
): Promise<Uint8Array> {
  const rsa = new RSA(importRsaKey(privateKey, "PRIVATE"));
  return new Uint8Array((await rsa.decrypt(data, { padding: "pkcs1" })).buffer);
}

export interface KeyPair {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
}

/**
 * Generates an RSA key pair for the encryption setup of a Minecraft server.
 */
export async function generateKeyPair(): Promise<KeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 1024,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-1",
    },
    true,
    ["sign", "verify"],
  );

  return {
    privateKey: new Uint8Array(
      await crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
    ),
    publicKey: new Uint8Array(
      await crypto.subtle.exportKey("spki", keyPair.publicKey),
    ),
  };
}

function importRsaKey(key: Uint8Array, type: string) {
  return RSA.parseKey(
    `-----BEGIN ${type} KEY-----\n${
      btoa(String.fromCharCode(...key))
        .replace(/(.{65})(?!$)/g, "$1\n")
    }-----END ${type} KEY-----\n`,
    "pem",
  );
}
