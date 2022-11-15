import * as base64url from "https://deno.land/std@0.164.0/encoding/base64url.ts";

export interface RsaPrivateKey {
  n: bigint;
  e: bigint;
  d: bigint;
  p: bigint;
  q: bigint;
  dp: bigint;
  dq: bigint;
  qi: bigint;
  length: number;
  signingKey: CryptoKey;
}

export interface RsaPublicKey {
  n: bigint;
  e: bigint;
  length: number;
  verifyKey: CryptoKey;
}

export interface RsaKeyPair {
  privateKey: RsaPrivateKey;
  publicKey: RsaPublicKey;
}

export async function generateRsaKeyPair(): Promise<RsaKeyPair> {
  const { privateKey, publicKey } = await crypto.subtle.generateKey(
    {
      ...RSA_ALG,
      modulusLength: 1024,
      publicExponent: new Uint8Array([1, 0, 1]),
    },
    true,
    ["sign", "verify"],
  );

  return {
    privateKey: await importRsaPrivateKey(privateKey),
    publicKey: await importRsaPublicKey(publicKey),
  };
}

export async function importRsaPrivateKey(
  privateKey: Uint8Array | CryptoKey,
): Promise<RsaPrivateKey> {
  privateKey = privateKey instanceof CryptoKey
    ? privateKey
    : await crypto.subtle.importKey("pkcs8", privateKey, RSA_ALG, true, [
      "sign",
    ]);
  if (privateKey.type != "private") throw new Error("Key must be private key");
  const jwk = await crypto.subtle.exportKey("jwk", privateKey);
  const n = base64url.decode(jwk.n!);
  return {
    n: bigIntFromBuf(n),
    e: bigIntFromBuf(base64url.decode(jwk.e!)),
    d: bigIntFromBuf(base64url.decode(jwk.d!)),
    p: bigIntFromBuf(base64url.decode(jwk.p!)),
    q: bigIntFromBuf(base64url.decode(jwk.q!)),
    dp: bigIntFromBuf(base64url.decode(jwk.dp!)),
    dq: bigIntFromBuf(base64url.decode(jwk.dq!)),
    qi: bigIntFromBuf(base64url.decode(jwk.qi!)),
    length: n.length,
    signingKey: privateKey,
  };
}

export async function importRsaPublicKey(
  publicKey: Uint8Array | CryptoKey,
): Promise<RsaPublicKey> {
  publicKey = publicKey instanceof CryptoKey
    ? publicKey
    : await crypto.subtle.importKey("spki", publicKey, RSA_ALG, true, [
      "verify",
    ]);
  if (publicKey.type != "public") throw new Error("Key must be public key");
  const jwk = await crypto.subtle.exportKey("jwk", publicKey);
  const n = base64url.decode(jwk.n!);
  return {
    n: bigIntFromBuf(n),
    e: bigIntFromBuf(base64url.decode(jwk.e!)),
    length: n.length,
    verifyKey: publicKey,
  };
}

export async function exportRsaPrivateKey(
  privateKey: RsaPrivateKey,
): Promise<Uint8Array> {
  return new Uint8Array(
    await crypto.subtle.exportKey("pkcs8", privateKey.signingKey),
  );
}

export async function exportRsaPublicKey(
  publicKey: RsaPublicKey,
): Promise<Uint8Array> {
  return new Uint8Array(
    await crypto.subtle.exportKey("spki", publicKey.verifyKey),
  );
}

export function encryptRsaPkcs1(
  publicKey: RsaPublicKey,
  data: Uint8Array,
): Promise<Uint8Array> {
  if (data.length > publicKey.length - 11) throw new Error("Message too long");
  const em = new Uint8Array(publicKey.length);
  em[1] = 2;
  const ps = crypto.getRandomValues(em.subarray(2, -data.length - 1));
  for (let i = 0; i < ps.length; i++) ps[i] |= 1;
  em.set(data, em.length - data.length);
  const c = encrypt(publicKey, bigIntFromBuf(em));
  return Promise.resolve(bigIntToBuf(c, em.length));
}

export function decryptRsaPkcs1(
  privateKey: RsaPrivateKey,
  data: Uint8Array,
): Promise<Uint8Array> {
  const m = decrypt(privateKey, bigIntFromBuf(data));
  const em = bigIntToBuf(m, privateKey.length);
  if (em[0] != 0 || em[1] != 2) throw new Error("Decryption error");
  let i = 2;
  while (em[i] != 0 && i < em.length) i++;
  if (i == em.length) throw new Error("Decryption error");
  if (i < 10) throw new Error("Decryption error");
  return Promise.resolve(em.subarray(i + 1));
}

export async function signRsaPkcs1Sha256(
  privateKey: RsaPrivateKey,
  data: Uint8Array,
): Promise<Uint8Array> {
  return new Uint8Array(
    await crypto.subtle.sign(RSA_ALG, privateKey.signingKey, data),
  );
}

export function verifyRsaPkcs1Sha256(
  publicKey: RsaPublicKey,
  signature: Uint8Array,
  data: Uint8Array,
): Promise<boolean> {
  return crypto.subtle.verify(RSA_ALG, publicKey.verifyKey, signature, data);
}

const RSA_ALG = {
  name: "RSASSA-PKCS1-v1_5",
  hash: "SHA-256",
};

function encrypt(key: RsaPublicKey, m: bigint) {
  return powerMod(m, key.e, key.n);
}

function decrypt(key: RsaPrivateKey, c: bigint) {
  const m1 = powerMod(c % key.p, key.dp, key.p);
  const m2 = powerMod(c % key.q, key.dq, key.q);
  let h = (key.qi * (m1 - m2)) % key.p;
  if (h < 0n) h += key.p;
  return (m2 + h * key.q) % (key.q * key.p);
}

function powerMod(base: bigint, exp: bigint, m: bigint) {
  base %= m;
  let res = 1n;
  while (exp != 0n) {
    if (exp % 2n == 1n) res = (res * base) % m;
    base = (base * base) % m;
    exp /= 2n;
  }
  return res;
}

function bigIntBufLength(x: bigint) {
  let length = 0;
  while (x != 0n) {
    x >>= 8n;
    length++;
  }
  return length;
}

function bigIntToBuf(x: bigint, length: number = bigIntBufLength(x)) {
  const buf = new Uint8Array(length);
  for (let i = length; i--;) {
    if (x == 0n) break;
    buf[i] = Number(x & 0xffn);
    x >>= 8n;
  }
  return buf;
}

function bigIntFromBuf(buf: Uint8Array) {
  let x = 0n;
  for (const b of buf) x = x << 8n | BigInt(b);
  return x;
}
