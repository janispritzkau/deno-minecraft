export class Writer {
  #textEncoder = new TextEncoder();
  #buf: Uint8Array;
  #view: DataView;
  #pos: number;

  constructor(buf?: Uint8Array) {
    this.#buf = buf ?? new Uint8Array(16);
    this.#view = new DataView(this.#buf.buffer, this.#buf.byteOffset, this.#buf.byteLength);
    this.#pos = 0;
  }

  bytes(): Uint8Array {
    return this.#buf.subarray(0, this.#pos);
  }

  writeByte(x: number): this {
    this.grow(1);
    this.#view.setInt8(this.#pos, x);
    this.#pos += 1;
    return this;
  }

  writeUnsignedByte(x: number): this {
    this.grow(1);
    this.#view.setUint8(this.#pos, x);
    this.#pos += 1;
    return this;
  }

  writeShort(x: number): this {
    this.grow(2);
    this.#view.setInt16(this.#pos, x);
    this.#pos += 2;
    return this;
  }

  writeUnsignedShort(x: number): this {
    this.grow(2);
    this.#view.setUint16(this.#pos, x);
    this.#pos += 2;
    return this;
  }

  writeInt(x: number): this {
    this.grow(4);
    this.#view.setInt32(this.#pos, x);
    this.#pos += 4;
    return this;
  }

  writeUnsignedInt(x: number): this {
    this.grow(4);
    this.#view.setUint32(this.#pos, x);
    this.#pos += 4;
    return this;
  }

  writeLong(x: bigint): this {
    this.grow(8);
    this.#view.setBigInt64(this.#pos, x);
    this.#pos += 8;
    return this;
  }

  writeUnsignedLong(x: bigint): this {
    this.grow(8);
    this.#view.setBigUint64(this.#pos, x);
    this.#pos += 8;
    return this;
  }

  writeFloat(x: number): this {
    this.grow(4);
    this.#view.setFloat32(this.#pos, x);
    this.#pos += 4;
    return this;
  }

  writeDouble(x: number): this {
    this.grow(8);
    this.#view.setFloat64(this.#pos, x);
    this.#pos += 8;
    return this;
  }

  writeBoolean(x: boolean): this {
    return this.writeByte(Number(x));
  }

  writeVarInt(x: number): this {
    do {
      let b = x & 0x7f;
      x >>>= 7;
      if (x != 0) b |= 0x80;
      this.writeByte(b);
    } while (x != 0);
    return this;
  }

  writeVarLong(x: bigint): this {
    x = BigInt.asUintN(64, x);
    do {
      let b = x & 0x7fn;
      x = BigInt.asUintN(64, x >> 7n);
      if (x != 0n) b |= 0x80n;
      this.writeByte(Number(b));
    } while (x != 0n);
    return this;
  }

  write(buf: Uint8Array): this {
    this.grow(buf.byteLength);
    this.#buf.set(buf, this.#pos);
    this.#pos += buf.byteLength;
    return this;
  }

  writeString(text: string, maxLength?: number): this {
    maxLength ??= 32767;
    if (text.length > maxLength) {
      throw new Error(
        `String is too long (${text.length} exceeds the maximum length of ${maxLength})`,
      );
    }
    const buf = this.#textEncoder.encode(text);
    if (buf.length > maxLength * 3) {
      throw new Error(
        `String is too large (${buf.length} exceeds maximum length of ${maxLength * 3} bytes)`,
      );
    }
    this.writeVarInt(buf.byteLength);
    this.write(buf);
    return this;
  }

  writeByteArray(array: Uint8Array): this {
    this.writeVarInt(array.length);
    this.write(array);
    return this;
  }

  writeIntArray(array: Int32Array): this {
    this.writeVarInt(array.length);
    for (const x of array) this.writeInt(x);
    return this;
  }

  writeLongArray(array: BigInt64Array): this {
    this.writeVarInt(array.length);
    for (const x of array) this.writeLong(x);
    return this;
  }

  grow(length: number) {
    const capacity = this.#buf.buffer.byteLength;

    if (this.#buf.byteOffset + this.#buf.byteLength < capacity) {
      this.#buf = new Uint8Array(this.#buf.buffer, this.#buf.byteOffset);
    }

    if (this.#pos + length <= capacity) return;

    const buf = this.#buf;
    this.#buf = new Uint8Array(buf.byteLength * 2 + length);
    this.#buf.set(buf);
    this.#view = new DataView(this.#buf.buffer);
  }
}
