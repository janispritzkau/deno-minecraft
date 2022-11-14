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
    n: bufToInt(n),
    e: bufToInt(base64url.decode(jwk.e!)),
    d: bufToInt(base64url.decode(jwk.d!)),
    p: bufToInt(base64url.decode(jwk.p!)),
    q: bufToInt(base64url.decode(jwk.q!)),
    dp: bufToInt(base64url.decode(jwk.dp!)),
    dq: bufToInt(base64url.decode(jwk.dq!)),
    qi: bufToInt(base64url.decode(jwk.qi!)),
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
    n: bufToInt(n),
    e: bufToInt(base64url.decode(jwk.e!)),
    length: n.length,
    verifyKey: publicKey,
  };
}

export async function exportRsaPrivateKey(
  privateKey: RsaPrivateKey,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "RSA",
      alg: "RS1",
      d: base64url.encode(intToBuf(privateKey.d)),
      e: base64url.encode(intToBuf(privateKey.e)),
      n: base64url.encode(intToBuf(privateKey.n)),
      p: base64url.encode(intToBuf(privateKey.p)),
      q: base64url.encode(intToBuf(privateKey.q)),
      dp: base64url.encode(intToBuf(privateKey.dp)),
      dq: base64url.encode(intToBuf(privateKey.dq)),
      qi: base64url.encode(intToBuf(privateKey.qi)),
    },
    RSA_ALG,
    true,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.exportKey("pkcs8", key));
}

export async function exportRsaPublicKey(
  publicKey: RsaPublicKey,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "RSA",
      alg: "RS1",
      e: base64url.encode(intToBuf(publicKey.e)),
      n: base64url.encode(intToBuf(publicKey.n)),
    },
    RSA_ALG,
    true,
    ["verify"],
  );
  return new Uint8Array(await crypto.subtle.exportKey("spki", key));
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
  return Promise.resolve(intToBuf(rsaep(publicKey, bufToInt(em)), em.length));
}

export function decryptRsaPkcs1(
  privateKey: RsaPrivateKey,
  data: Uint8Array,
): Promise<Uint8Array> {
  const em = intToBuf(rsadp(privateKey, bufToInt(data)), privateKey.length);
  if (em[0] != 0 || em[1] != 2) throw new Error("Decryption error");
  let i = 2;
  while (em[i] != 0 && i < em.length) i++;
  if (i == em.length) throw new Error("Decryption error");
  if (i < 10) throw new Error("Decryption error");
  return Promise.resolve(em.subarray(i));
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

function intByteLength(x: bigint) {
  let length = 0;
  while (x != 0n) {
    x >>= 8n;
    length++;
  }
  return length;
}

function intToBuf(x: bigint, length: number = intByteLength(x)) {
  const buf = new Uint8Array(length);
  for (let i = length; i--;) {
    if (x == 0n) break;
    buf[i] = Number(x & 0xffn);
    x >>= 8n;
  }
  return buf;
}

function bufToInt(buf: Uint8Array) {
  let x = 0n;
  for (const b of buf) x = x << 8n | BigInt(b);
  return x;
}

function powMod(base: bigint, exp: bigint, m: bigint) {
  base %= m;
  let res = 1n;
  while (exp != 0n) {
    if (exp % 2n == 1n) res = (res * base) % m;
    base = (base * base) % m;
    exp /= 2n;
  }
  return res;
}

function rsaep(k: RsaPublicKey, m: bigint) {
  return powMod(m, k.e, k.n);
}

function rsadp(k: RsaPrivateKey, c: bigint) {
  return powMod(c, k.d, k.n);
}
