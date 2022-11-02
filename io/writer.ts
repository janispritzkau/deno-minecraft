export class Writer {
  #buf: Uint8Array;
  #view: DataView;
  #pos = 0;
  #textEncoder = new TextEncoder();

  constructor(buf = new Uint8Array(16)) {
    this.#buf = buf;
    this.#view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  }

  bytes() {
    return this.#buf.subarray(0, this.#pos);
  }

  writeByte(x: number) {
    this.grow(1);
    this.#view.setInt8(this.#pos, x);
    this.#pos += 1;
    return this
  }

  writeUnsignedByte(x: number) {
    this.grow(1);
    this.#view.setUint8(this.#pos, x);
    this.#pos += 1;
    return this
  }

  writeShort(x: number) {
    this.grow(2);
    this.#view.setInt16(this.#pos, x);
    this.#pos += 2;
    return this
  }

  writeUnsignedShort(x: number) {
    this.grow(2);
    this.#view.setUint16(this.#pos, x);
    this.#pos += 2;
    return this
  }

  writeInt(x: number) {
    this.grow(4);
    this.#view.setInt32(this.#pos, x);
    this.#pos += 4;
    return this
  }

  writeUnsignedInt(x: number) {
    this.grow(4);
    this.#view.setUint32(this.#pos, x);
    this.#pos += 4;
    return this
  }

  writeLong(x: bigint) {
    this.grow(8);
    this.#view.setBigInt64(this.#pos, x);
    this.#pos += 8;
    return this
  }

  writeUnsignedLong(x: bigint) {
    this.grow(8);
    this.#view.setBigUint64(this.#pos, x);
    this.#pos += 8;
    return this
  }

  writeFloat(x: number) {
    this.grow(4);
    this.#view.setFloat32(this.#pos, x);
    this.#pos += 4;
    return this
  }

  writeDouble(x: number) {
    this.grow(8);
    this.#view.setFloat64(this.#pos, x);
    this.#pos += 8;
    return this
  }

  writeBoolean(x: boolean) {
    return this.writeByte(Number(x));
  }

  write(buf: Uint8Array) {
    this.grow(buf.byteLength);
    this.#buf.set(buf, this.#pos);
    this.#pos += buf.byteLength;
    return this;
  }

  writeString(text: string) {
    const buf = this.#textEncoder.encode(text);
    this.writeVarInt(buf.byteLength);
    this.write(buf);
    return this;
  }

  writeJSON(value: unknown) {
    return this.writeString(JSON.stringify(value));
  }

  writeVarInt(x: number) {
    do {
      let b = x & 0x7f;
      x >>>= 7;
      if (x != 0) b |= 0x80;
      this.writeByte(b);
    } while (x != 0);
    return this;
  }

  writeVarLong(x: bigint) {
    x = BigInt.asUintN(64, x);
    do {
      let b = x & 0x7fn;
      x = BigInt.asUintN(64, x >> 7n);
      if (x != 0n) b |= 0x80n;
      this.writeByte(Number(b));
    } while (x != 0n);
    return this;
  }

  grow(length: number) {
    const capacity = this.#buf.byteLength;
    if (this.#pos + length <= capacity) return;
    const old = this.#buf;
    this.#buf = new Uint8Array(capacity * 2 + length);
    this.#buf.set(old);
    this.#view = new DataView(this.#buf.buffer);
  }
}
