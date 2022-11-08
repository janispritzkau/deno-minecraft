import { Aes } from "https://deno.land/x/crypto@v0.10.0/aes.ts";

interface Cipher {
  encrypt(buf: Uint8Array): void;
  decrypt(buf: Uint8Array): void;
}

interface CipherConstructor {
  new (key: Uint8Array, iv: Uint8Array): Cipher;
}

let CipherFfi: CipherConstructor | undefined;

export class Aes128Cfb8 implements Cipher {
  #cipher: Cipher;

  constructor(key: Uint8Array, iv: Uint8Array) {
    this.#cipher = CipherFfi ? new CipherFfi(key, iv) : new CipherJs(key, iv);
  }

  encrypt(buf: Uint8Array) {
    this.#cipher.encrypt(buf);
  }

  decrypt(buf: Uint8Array) {
    this.#cipher.decrypt(buf);
  }
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

let sslPath: string | undefined;
try {
  sslPath = Deno.env.get("DENO_SSL_PATH");
} catch (e) {
  if (!(e instanceof Deno.errors.PermissionDenied)) throw e;
}

if (sslPath && "dlopen" in Deno) {
  // @ts-ignore unstable api
  const dl = Deno.dlopen(
    sslPath,
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

  // about 4x faster than the js implementation
  CipherFfi = class CipherFfi {
    #key = new Uint32Array(60);
    #iv: Uint8Array;

    constructor(key: Uint8Array, iv: Uint8Array) {
      const code = dl.symbols.AES_set_encrypt_key(key, 128, this.#key);
      if (code != 0) throw new Error("Invalid or missing key");
      this.#iv = iv.slice();
    }

    encrypt(buf: Uint8Array) {
      dl.symbols.AES_cfb8_encrypt(
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
      dl.symbols.AES_cfb8_encrypt(
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
