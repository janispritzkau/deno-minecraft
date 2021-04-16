import { NBTWriter } from "./writer.ts";

export class TagNotFound extends Error {
  name = "TagNotFound";
}

export class TagWrongType extends Error {
  name = "TagWrongType";
}

export interface Tag {
  // deno-lint-ignore no-explicit-any
  valueOf(): any;
  getId(): number;
  write(writer: NBTWriter): void;
}

export class ByteTag implements Tag {
  constructor(private value: number) {}

  valueOf() {
    return this.value;
  }

  getId() {
    return 1;
  }

  write(writer: NBTWriter) {
    writer.writeByte(this.value);
  }
}

export class ShortTag implements Tag {
  constructor(private value: number) {}

  valueOf() {
    return this.value;
  }

  getId() {
    return 2;
  }

  write(writer: NBTWriter) {
    writer.writeShort(this.value);
  }
}

export class IntTag implements Tag {
  constructor(private value: number) {}

  valueOf() {
    return this.value;
  }

  getId() {
    return 3;
  }

  write(writer: NBTWriter) {
    writer.writeInt(this.value);
  }
}

export class LongTag implements Tag {
  constructor(private value: bigint) {}

  valueOf() {
    return this.value;
  }

  getId() {
    return 4;
  }

  write(writer: NBTWriter) {
    writer.writeLong(this.value);
  }
}

export class FloatTag implements Tag {
  constructor(private value: number) {}

  valueOf() {
    return this.value;
  }

  getId() {
    return 5;
  }

  write(writer: NBTWriter) {
    writer.writeFloat(this.value);
  }
}

export class DoubleTag implements Tag {
  constructor(private value: number) {}

  valueOf() {
    return this.value;
  }

  getId() {
    return 6;
  }

  write(writer: NBTWriter) {
    writer.writeDouble(this.value);
  }
}

export class ByteArrayTag implements Tag {
  constructor(private value: Uint8Array) {}

  valueOf() {
    return this.value;
  }

  getId() {
    return 7;
  }

  write(writer: NBTWriter) {
    writer.writeByteArray(this.value);
  }
}

export class StringTag implements Tag {
  constructor(private value: string) {}

  valueOf() {
    return this.value;
  }

  getId() {
    return 8;
  }

  write(writer: NBTWriter) {
    writer.writeString(this.value);
  }
}

export class ListTag<T extends Tag> implements Tag {
  constructor(private tags: T[] = []) {}

  valueOf() {
    return this.tags;
  }

  getId() {
    return 9;
  }

  write(writer: NBTWriter) {
    writer.writeList(this.tags);
  }
}

export class CompoundTag implements Tag {
  constructor(private tags = new Map<string, Tag>()) {}

  valueOf() {
    return this.tags;
  }

  getId() {
    return 10;
  }

  write(writer: NBTWriter) {
    writer.writeCompound(this.tags);
  }

  set(key: string, tag: Tag) {
    this.tags.set(key, tag);
    return this;
  }

  setByte(key: string, value: number) {
    this.set(key, new ByteTag(value));
    return this;
  }

  setShort(key: string, value: number) {
    this.set(key, new ShortTag(value));
    return this;
  }

  setInt(key: string, value: number) {
    this.set(key, new IntTag(value));
    return this;
  }

  setLong(key: string, value: bigint) {
    this.set(key, new LongTag(value));
    return this;
  }

  setFloat(key: string, value: number) {
    this.set(key, new FloatTag(value));
    return this;
  }

  setDouble(key: string, value: number) {
    this.set(key, new DoubleTag(value));
    return this;
  }

  setByteArray(key: string, value: Uint8Array) {
    this.set(key, new ByteArrayTag(value));
    return this;
  }

  setString(key: string, value: string) {
    this.set(key, new StringTag(value));
    return this;
  }

  setList<T extends Tag>(key: string, value: T[]) {
    this.set(key, new ListTag(value));
    return this;
  }

  setCompound(key: string, value: CompoundTag) {
    this.set(key, value);
    return this;
  }

  setIntArray(key: string, value: Int32Array) {
    this.set(key, new IntArrayTag(value));
    return this;
  }

  setLongArray(key: string, value: BigInt64Array) {
    this.set(key, new LongArrayTag(value));
    return this;
  }

  setBoolean(key: string, value: boolean) {
    return this.setByte(key, Number(value));
  }

  has(key: string) {
    return this.tags.has(key);
  }

  get(key: string) {
    return this.tags.get(key) ?? null;
  }

  getByte(key: string) {
    return this.getType(key, ByteTag).valueOf();
  }

  getShort(key: string) {
    return this.getType(key, ShortTag).valueOf();
  }

  getInt(key: string) {
    return this.getType(key, IntTag).valueOf();
  }

  getLong(key: string) {
    return this.getType(key, LongTag).valueOf();
  }

  getFloat(key: string) {
    return this.getType(key, FloatTag).valueOf();
  }

  getDouble(key: string) {
    return this.getType(key, DoubleTag).valueOf();
  }

  getByteArray(key: string) {
    return this.getType(key, ByteArrayTag).valueOf();
  }

  getString(key: string) {
    return this.getType(key, StringTag).valueOf();
  }

  getList(key: string) {
    return this.getType(key, ListTag).valueOf();
  }

  getCompound(key: string) {
    return this.getType(key, CompoundTag);
  }

  getIntArray(key: string) {
    return this.getType(key, IntArrayTag).valueOf();
  }

  getLongArray(key: string) {
    return this.getType(key, LongArrayTag).valueOf();
  }

  getBoolean(key: string) {
    return Boolean(this.getByte(key));
  }

  // deno-lint-ignore no-explicit-any
  private getType<T extends new (...args: any) => InstanceType<T>>(
    key: string,
    constructor: T,
  ) {
    const tag = this.tags.get(key);
    if (tag == null) throw new TagNotFound();
    if (!(tag instanceof constructor)) {
      throw new TagWrongType(
        `Expected ${constructor.name} but got ${tag.constructor.name}`,
      );
    }
    return tag;
  }
}

export class IntArrayTag implements Tag {
  constructor(private value: Int32Array) {}

  valueOf() {
    return this.value;
  }

  getId() {
    return 11;
  }

  write(writer: NBTWriter) {
    writer.writeIntArray(this.value);
  }
}

export class LongArrayTag implements Tag {
  constructor(private value: BigInt64Array) {}

  valueOf() {
    return this.value;
  }

  getId() {
    return 12;
  }

  write(writer: NBTWriter) {
    writer.writeLongArray(this.value);
  }
}
