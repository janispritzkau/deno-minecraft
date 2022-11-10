import {
  ByteArrayTag,
  ByteTag,
  CompoundTag,
  DoubleTag,
  FloatTag,
  IntArrayTag,
  IntTag,
  ListTag,
  LongArrayTag,
  LongTag,
  ShortTag,
  StringTag,
  Tag,
} from "./tag.ts";
import { IO_GET_ID, IO_WRITE } from "./_tag.ts";

export function decodeCompoundTag(buf: Uint8Array): CompoundTag | null {
  return new TagReader(buf).readCompoundTag();
}

export function encodeCompoundTag(tag: CompoundTag | null): Uint8Array {
  const writer = new TagWriter();
  writer.writeCompoundTag(tag);
  return writer.bytes();
}

export class TagReader {
  #textDecoder = new TextDecoder();
  #buf: Uint8Array;
  #view: DataView;
  #pos = 0;

  constructor(buf: Uint8Array) {
    this.#buf = buf;
    this.#view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  }

  get bytesRead(): number {
    return this.#pos;
  }

  readByte(): number {
    const x = this.#view.getInt8(this.#pos);
    this.#pos += 1;
    return x;
  }

  readShort(): number {
    const x = this.#view.getInt16(this.#pos);
    this.#pos += 2;
    return x;
  }

  readInt(): number {
    const x = this.#view.getInt32(this.#pos);
    this.#pos += 4;
    return x;
  }

  readLong(): bigint {
    const x = this.#view.getBigInt64(this.#pos);
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

  readByteArray(): Uint8Array {
    const len = this.readInt();
    return this.#buf.subarray(this.#pos, this.#pos += len);
  }

  readString(): string {
    const len = this.readShort();
    return this.#textDecoder.decode(
      this.#buf.subarray(this.#pos, this.#pos += len),
    );
  }

  readList(): Tag[] {
    const id = this.readByte();
    const len = this.readInt();
    const list: Tag[] = [];
    for (let i = 0; i < len; i++) list.push(this.readTag(id));
    return list;
  }

  readCompound(): Map<string, Tag> {
    const map = new Map<string, Tag>();
    while (true) {
      const id = this.readByte();
      if (id == 0) break;
      const key = this.readString();
      map.set(key, this.readTag(id));
    }
    return map;
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

  readTag(id: number): Tag {
    switch (id) {
      case 1:
        return new ByteTag(this.readByte());
      case 2:
        return new ShortTag(this.readShort());
      case 3:
        return new IntTag(this.readInt());
      case 4:
        return new LongTag(this.readLong());
      case 5:
        return new FloatTag(this.readFloat());
      case 6:
        return new DoubleTag(this.readDouble());
      case 7:
        return new ByteArrayTag(this.readByteArray());
      case 8:
        return new StringTag(this.readString());
      case 9:
        return new ListTag(this.readList());
      case 10:
        return new CompoundTag(this.readCompound());
      case 11:
        return new IntArrayTag(this.readIntArray());
      case 12:
        return new LongArrayTag(this.readLongArray());
      default:
        throw new Error(`Unknown tag id ${id}`);
    }
  }

  readCompoundTag(): CompoundTag | null {
    const id = this.readByte();
    if (id == 0) return null;
    if (id != 10) throw new Error("Root tag must be a compound tag");
    const len = this.readShort();
    this.#pos += len;
    return new CompoundTag(this.readCompound());
  }
}

export class TagWriter {
  #textEncoder = new TextEncoder();
  #buf: Uint8Array;
  #view: DataView;
  #pos: number;

  constructor(buf: Uint8Array = new Uint8Array(16), pos = 0) {
    this.#buf = buf;
    this.#view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    this.#pos = pos;
  }

  get pos(): number {
    return this.#pos;
  }

  bytes(): Uint8Array {
    return this.#buf.subarray(0, this.#pos);
  }

  writeByte(x: number) {
    this.#grow(1);
    this.#view.setInt8(this.#pos, x);
    this.#pos += 1;
  }

  writeShort(x: number) {
    this.#grow(2);
    this.#view.setInt16(this.#pos, x);
    this.#pos += 2;
  }

  writeInt(x: number) {
    this.#grow(4);
    this.#view.setInt32(this.#pos, x);
    this.#pos += 4;
  }

  writeLong(x: bigint) {
    this.#grow(8);
    this.#view.setBigInt64(this.#pos, x);
    this.#pos += 8;
  }

  writeFloat(x: number) {
    this.#grow(4);
    this.#view.setFloat32(this.#pos, x);
    this.#pos += 4;
  }

  writeDouble(x: number) {
    this.#grow(8);
    this.#view.setFloat64(this.#pos, x);
    this.#pos += 8;
  }

  writeByteArray(array: Uint8Array) {
    this.writeInt(array.length);
    this.#write(array);
  }

  writeString(text: string) {
    const buf = this.#textEncoder.encode(text);
    this.writeShort(buf.byteLength);
    this.#write(buf);
  }

  writeList(list: Tag[]) {
    const id = list.length == 0 ? 0 : list[0][IO_GET_ID]();
    this.writeByte(id);
    this.writeInt(list.length);
    for (const tag of list) {
      if (tag[IO_GET_ID]() != id) {
        throw new Error("All tags in a list must be of the same type");
      }
      this.writeTag(tag);
    }
  }

  writeCompound(map: Map<string, Tag>) {
    for (const [key, tag] of map) {
      this.writeByte(tag[IO_GET_ID]());
      this.writeString(key);
      this.writeTag(tag);
    }
    this.writeByte(0);
  }

  writeIntArray(array: Int32Array) {
    this.writeInt(array.length);
    this.#grow(array.byteLength);
    for (let i = 0; i < array.length; i++) {
      this.#view.setInt32(this.#pos, array[i]);
      this.#pos += 4;
    }
  }

  writeLongArray(array: BigInt64Array) {
    this.writeInt(array.length);
    this.#grow(array.byteLength);
    for (let i = 0; i < array.length; i++) {
      this.#view.setBigInt64(this.#pos, array[i]);
      this.#pos += 8;
    }
  }

  writeTag(tag: Tag) {
    tag[IO_WRITE](this);
  }

  writeCompoundTag(tag: CompoundTag | null) {
    if (tag == null) {
      this.writeByte(0);
      return;
    }
    this.writeByte(tag[IO_GET_ID]());
    this.writeShort(0);
    this.writeTag(tag);
  }

  #write(buf: Uint8Array) {
    this.#grow(buf.byteLength);
    this.#buf.set(buf, this.#pos);
    this.#pos += buf.byteLength;
  }

  #grow(len: number) {
    const capacity = this.#buf.byteLength;
    if (this.#pos + len <= capacity) return;
    const old = this.#buf;
    this.#buf = new Uint8Array(capacity * 2 + len);
    this.#buf.set(old);
    this.#view = new DataView(this.#buf.buffer);
  }
}
