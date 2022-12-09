import { Aes } from "https://deno.land/x/crypto@v0.10.0/aes.ts";

export class Aes128Cfb8 implements Cipher {
  #cipher: Cipher;

  constructor(key: Uint8Array, iv: Uint8Array) {
    this.#cipher = new CipherImpl(key, iv);
  }

  encrypt(buf: Uint8Array) {
    this.#cipher.encrypt(buf);
  }

  decrypt(buf: Uint8Array) {
    this.#cipher.decrypt(buf);
  }
}

interface Cipher {
  encrypt(buf: Uint8Array): void;
  decrypt(buf: Uint8Array): void;
}

class CipherJs implements Cipher {
  #aes: Aes;
  #iv: Uint8Array;
  #ivView: DataView;
  #tmp = new Uint8Array(16);

  constructor(key: Uint8Array, iv: Uint8Array) {
    this.#aes = new Aes(key);
    this.#iv = iv.slice();
    this.#ivView = new DataView(this.#iv.buffer);
  }

  encrypt(data: Uint8Array) {
    for (let i = 0; i < data.length; i++) {
      this.#tmp.set(this.#iv);
      this.#aes.encryptBlock(this.#ivView, 0);
      const val = data[i] ^ this.#iv[0];
      this.#iv.set(this.#tmp);
      this.#iv.copyWithin(0, 1);
      this.#iv[15] = val;
      data[i] = val;
    }
  }

  decrypt(data: Uint8Array) {
    for (let i = 0; i < data.length; i++) {
      this.#tmp.set(this.#iv);
      this.#aes.encryptBlock(this.#ivView, 0);
      const val = data[i] ^ this.#iv[0];
      this.#iv.set(this.#tmp);
      this.#iv.copyWithin(0, 1);
      this.#iv[15] = data[i];
      data[i] = val;
    }
  }
}

let CipherImpl: new (key: Uint8Array, iv: Uint8Array) => Cipher = CipherJs;

const OPENSSL_PATH = await Deno.permissions.query({
  name: "env",
  variable: "OPENSSL_PATH",
}).then(({ state }) => state == "granted" ? Deno.env.get("OPENSSL_PATH") : null);

if (OPENSSL_PATH && "dlopen" in Deno) {
  // @ts-ignore unstable api
  const lib = Deno.dlopen(
    OPENSSL_PATH,
    {
      AES_set_encrypt_key: {
        parameters: ["buffer", "u32", "buffer"],
        result: "i32",
      },
      AES_cfb8_encrypt: {
        parameters: [
          "buffer",
          "buffer",
          "usize",
          "buffer",
          "buffer",
          "pointer",
          "u32",
        ],
        result: "void",
      },
    } as const,
  );

  // about 4x faster than the pure js implementation
  CipherImpl = class CipherFfi {
    #key = new Uint32Array(60);
    #iv: Uint8Array;

    constructor(key: Uint8Array, iv: Uint8Array) {
      const code = lib.symbols.AES_set_encrypt_key(key, 128, this.#key);
      if (code != 0) throw new Error("Invalid or missing key");
      this.#iv = iv.slice();
    }

    encrypt(buf: Uint8Array) {
      lib.symbols.AES_cfb8_encrypt(
        buf,
        buf,
        buf.length,
        this.#key,
        this.#iv,
        0,
        1,
      );
    }

    decrypt(buf: Uint8Array) {
      lib.symbols.AES_cfb8_encrypt(
        buf,
        buf,
        buf.length,
        this.#key,
        this.#iv,
        0,
        0,
      );
    }
  };
}
