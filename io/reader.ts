export class Reader {
  #buf: Uint8Array;
  #view: DataView;
  #pos = 0;
  #textDecoder = new TextDecoder();

  constructor(buf: Uint8Array) {
    this.#buf = buf;
    this.#view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  }

  bytesRead(): number {
    return this.#pos;
  }

  unreadBytes(): number {
    return this.#buf.byteLength - this.#pos;
  }

  readByte(): number {
    const x = this.#view.getInt8(this.#pos);
    this.#pos += 1;
    return x;
  }

  readUnsignedByte(): number {
    const x = this.#view.getUint8(this.#pos);
    this.#pos += 1;
    return x;
  }

  readShort(): number {
    const x = this.#view.getInt16(this.#pos);
    this.#pos += 2;
    return x;
  }

  readUnsignedShort(): number {
    const x = this.#view.getUint16(this.#pos);
    this.#pos += 2;
    return x;
  }

  readInt(): number {
    const x = this.#view.getInt32(this.#pos);
    this.#pos += 4;
    return x;
  }

  readUnsignedInt(): number {
    const x = this.#view.getUint32(this.#pos);
    this.#pos += 4;
    return x;
  }

  readLong(): bigint {
    const x = this.#view.getBigInt64(this.#pos);
    this.#pos += 8;
    return x;
  }

  readUnsignedLong(): bigint {
    const x = this.#view.getBigUint64(this.#pos);
    this.#pos += 8;
    return x;
  }

  readFloat(): number {
    const x = this.#view.getFloat32(this.#pos);
    this.#pos += 4;
    return x;
  }

  readDouble(): number {
    const x = this.#view.getFloat64(this.#pos);
    this.#pos += 8;
    return x;
  }

  readBoolean(): boolean {
    return Boolean(this.readByte());
  }

  read(length: number): Uint8Array {
    if (this.#pos + length > this.#buf.byteLength) {
      throw new Error("Unexpected end of buffer");
    }
    return this.#buf.subarray(this.#pos, this.#pos += length);
  }

  readString(maxLength?: number): string {
    const len = this.readVarInt();
    if (maxLength && len > maxLength) throw new Error("String is too long");
    return this.#textDecoder.decode(this.read(len));
  }

  readJSON(maxLength?: number): unknown {
    return JSON.parse(this.readString(maxLength));
  }

  readVarInt(): number {
    let x = 0, n = 0, b: number;
    do {
      b = this.readByte();
      x |= (b & 0x7f) << (7 * n);
      if (++n > 5) throw new Error("VarInt is too big");
    } while ((b & 0x80) != 0);
    return x;
  }

  readVarLong(): bigint {
    let x = 0n, n = 0n, b: number;
    do {
      b = this.readByte();
      x |= BigInt(b & 0x7f) << (7n * n);
      if (++n > 10n) throw new Error("VarLong is too big");
    } while ((b & 0x80) != 0);
    return BigInt.asIntN(64, x);
  }

  readIntArray(): Int32Array {
    const len = this.readInt();
    const array = new Int32Array(len);
    for (let i = 0; i < len; i++) array[i] = this.readInt();
    return array;
  }

  readLongArray(): BigInt64Array {
    const len = this.readInt();
    const array = new BigInt64Array(len);
    for (let i = 0; i < len; i++) array[i] = this.readLong();
    return array;
  }
}
