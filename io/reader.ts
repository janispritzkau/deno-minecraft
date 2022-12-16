export class Reader {
  #textDecoder = new TextDecoder();
  #buf: Uint8Array;
  #view: DataView;
  #pos: number;

  constructor(buf: Uint8Array) {
    this.#buf = buf;
    this.#view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    this.#pos = 0;
  }

  get bytesRead(): number {
    return this.#pos;
  }

  get unreadBytes(): number {
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

  read(length: number): Uint8Array {
    if (this.#pos + length > this.#buf.byteLength) {
      throw new Error("Unexpected end of buffer");
    }
    return this.#buf.subarray(this.#pos, this.#pos += length);
  }

  readString(maxLength?: number): string {
    maxLength ??= 32767;
    const length = this.readVarInt();
    if (length > maxLength * 3) {
      throw new Error(
        `The received string length is too large (${length} exceeds the maximum of ${maxLength} bytes)`,
      );
    } else if (length < 0) {
      throw new Error("The received string length cannot be negative");
    }
    const text = this.#textDecoder.decode(this.read(length));
    if (text.length > maxLength) {
      throw new Error(
        `The received string is too long (${length} exceeds the maximum of ${maxLength})`,
      );
    }
    return text;
  }

  readByteArray(maxLength?: number): Uint8Array {
    const length = this.readVarInt();
    if (maxLength && length > maxLength) {
      throw new Error(
        `The received array length is too large (${length} exceeds the maximum length of ${maxLength})`,
      );
    } else if (length < 0) {
      throw new Error("The received array length cannot be negative");
    }
    return this.read(length);
  }

  readIntArray(maxLength?: number): Int32Array {
    const length = this.readVarInt();
    if (maxLength && length > maxLength) {
      throw new Error(
        `The received array length is too large (${length} exceeds the maximum length of ${maxLength})`,
      );
    } else if (length < 0) {
      throw new Error("The received array length cannot be negative");
    }
    const array = new Int32Array(length);
    for (let i = 0; i < length; i++) array[i] = this.readInt();
    return array;
  }

  readLongArray(maxLength?: number): BigInt64Array {
    const length = this.readVarInt();
    if (maxLength && length > maxLength) {
      throw new Error(
        `The received array length is too large (${length} exceeds the maximum length of ${maxLength})`,
      );
    } else if (length < 0) {
      throw new Error("The received array length cannot be negative");
    }
    const array = new BigInt64Array(length);
    for (let i = 0; i < length; i++) array[i] = this.readLong();
    return array;
  }
}
