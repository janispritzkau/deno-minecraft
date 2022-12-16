import { Reader, Writer } from "../io/mod.ts";
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

export class TagReader {
  #textDecoder = new TextDecoder();
  #reader: Reader;

  constructor(reader: Reader) {
    this.#reader = reader;
  }

  readByte(): number {
    return this.#reader.readByte();
  }

  readShort(): number {
    return this.#reader.readShort();
  }

  readInt(): number {
    return this.#reader.readInt();
  }

  readLong(): bigint {
    return this.#reader.readLong();
  }

  readFloat(): number {
    return this.#reader.readFloat();
  }

  readDouble(): number {
    return this.#reader.readDouble();
  }

  readByteArray(): Uint8Array {
    return this.#reader.readByteArray();
  }

  readString(): string {
    const length = this.readShort();
    return this.#textDecoder.decode(this.#reader.read(length));
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
}

export class TagWriter {
  #textEncoder = new TextEncoder();
  #writer: Writer;

  constructor(writer: Writer) {
    this.#writer = writer;
  }

  writeByte(x: number) {
    return this.#writer.writeByte(x);
  }

  writeShort(x: number) {
    return this.#writer.writeShort(x);
  }

  writeInt(x: number) {
    return this.#writer.writeInt(x);
  }

  writeLong(x: bigint) {
    return this.#writer.writeLong(x);
  }

  writeFloat(x: number) {
    return this.#writer.writeFloat(x);
  }

  writeDouble(x: number) {
    return this.#writer.writeDouble(x);
  }

  writeByteArray(array: Uint8Array) {
    this.writeInt(array.length);
    this.#writer.write(array);
  }

  writeString(text: string) {
    const buf = this.#textEncoder.encode(text);
    this.writeShort(buf.byteLength);
    this.#writer.write(buf);
  }

  writeList(list: Tag[]) {
    const id = list.length == 0 ? 0 : list[0][IO_GET_ID]();
    this.writeByte(id);
    this.writeInt(list.length);
    for (const tag of list) {
      if (tag[IO_GET_ID]() != id) {
        throw new Error("All tags in a list must be of the same type");
      }
      tag[IO_WRITE](this);
    }
  }

  writeCompound(map: Map<string, Tag>) {
    for (const [key, tag] of map) {
      this.writeByte(tag[IO_GET_ID]());
      this.writeString(key);
      tag[IO_WRITE](this);
    }
    this.writeByte(0);
  }

  writeIntArray(array: Int32Array) {
    this.writeInt(array.length);
    this.#writer.grow(array.byteLength);
    for (let i = 0; i < array.length; i++) {
      this.writeInt(array[i]);
    }
  }

  writeLongArray(array: BigInt64Array) {
    this.writeInt(array.length);
    this.#writer.grow(array.byteLength);
    for (let i = 0; i < array.length; i++) {
      this.#writer.writeLong(array[i]);
    }
  }

  write(tag: Tag) {
    tag[IO_WRITE](this);
  }
}
