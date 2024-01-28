import { Aes } from "../deps.ts";

export class Aes128Cfb8 {
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
