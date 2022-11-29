import { CompoundTag } from "../nbt/tag.ts";
import { TagWriter } from "../nbt/io.ts";

export class Writer {
  #buf: Uint8Array;
  #view: DataView;
  #pos: number;
  #textEncoder = new TextEncoder();

  constructor(buf: Uint8Array = new Uint8Array(16), pos = 0) {
    this.#buf = buf;
    this.#view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    this.#pos = pos;
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

  write(buf: Uint8Array): this {
    this.grow(buf.byteLength);
    this.#buf.set(buf, this.#pos);
    this.#pos += buf.byteLength;
    return this;
  }

  writeString(text: string): this {
    const buf = this.#textEncoder.encode(text);
    this.writeVarInt(buf.byteLength);
    this.write(buf);
    return this;
  }

  writeJson(value: unknown): this {
    return this.writeString(JSON.stringify(value));
  }

  writeUuid(uuid: string): this {
    const x = BigInt(`0x${uuid.replaceAll("-", "")}`);
    return this.writeLong(x >> 64n).writeLong(BigInt.asUintN(64, x));
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

  writeCompoundTag(tag: CompoundTag | null) {
    const writer = new TagWriter(this.#buf, this.#pos);
    writer.writeCompoundTag(tag);
    const bytes = writer.bytes();
    this.#buf = new Uint8Array(bytes.buffer, bytes.byteOffset);
    this.#view = new DataView(bytes.buffer, bytes.byteOffset);
    this.#pos = writer.pos;
    return this;
  }

  writeOptional<T>(
    value: T | null | undefined,
    writeFn: (this: this, x: T) => void,
  ): this {
    this.writeBoolean(value != null);
    if (value != null) writeFn.call(this, value);
    return this;
  }

  writeList<T>(
    items: T[] | Iterable<T>,
    writeFn: (this: this, item: T) => void,
  ): this {
    const list = items instanceof Array ? items : [...items];
    this.writeVarInt(list.length);
    for (const item of list) writeFn.call(this, item);
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
