import { CompoundTag } from "../nbt/tag.ts";
import { TagReader } from "../nbt/io.ts";

export class Reader {
  #buf: Uint8Array;
  #view: DataView;
  #pos = 0;
  #textDecoder = new TextDecoder();

  constructor(buf: Uint8Array) {
    this.#buf = buf;
    this.#view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
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

  read(length: number): Uint8Array {
    if (this.#pos + length > this.#buf.byteLength) {
      throw new Error("Unexpected end of buffer");
    }
    return this.#buf.subarray(this.#pos, this.#pos += length);
  }

  readToEnd(): Uint8Array {
    return this.read(this.unreadBytes);
  }

  readString(maxLength?: number): string {
    const len = this.readVarInt();
    if (maxLength && len > maxLength) throw new Error("String is too long");
    return this.#textDecoder.decode(this.read(len));
  }

  readJson(maxLength?: number): unknown {
    return JSON.parse(this.readString(maxLength));
  }

  readUuid(): string {
    return (
      this.readUnsignedLong() << 64n |
      this.readUnsignedLong()
    ).toString(16).padStart(32, "0");
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

  readByteArray(): Uint8Array {
    const length = this.readVarInt();
    return this.read(length);
  }

  readIntArray(): Int32Array {
    const length = this.readVarInt();
    const array = new Int32Array(length);
    for (let i = 0; i < length; i++) array[i] = this.readInt();
    return array;
  }

  readLongArray(): BigInt64Array {
    const length = this.readVarInt();
    const array = new BigInt64Array(length);
    for (let i = 0; i < length; i++) array[i] = this.readLong();
    return array;
  }

  readCompoundTag(): CompoundTag | null {
    const reader = new TagReader(this.#buf.subarray(this.#pos));
    const tag = reader.readCompoundTag();
    this.#pos += reader.bytesRead;
    return tag;
  }

  readOptional<T>(readFn: (reader: Reader) => T): T | null {
    return this.readBoolean() ? readFn.call(this, this) : null;
  }

  readList<T>(readFn: (reader: Reader) => T): T[] {
    return [...this.readListIterable(readFn)];
  }

  *readListIterable<T>(readFn: (reader: Reader) => T): Iterable<T> {
    for (let i = this.readVarInt(); i--;) yield readFn.call(this, this);
  }
}
