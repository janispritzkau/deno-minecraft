import { TagWriter } from "./io.ts";
import { IO_GET_ID, IO_WRITE, NO_UNWRAP } from "./_tag.ts";

export abstract class Tag<T = unknown> {
  #value: T;

  constructor(value: T) {
    this.#value = value;
  }

  abstract [IO_GET_ID](): number;
  abstract [IO_WRITE](writer: TagWriter): void;

  [NO_UNWRAP](): boolean {
    return false;
  }

  valueOf(): T {
    return this.#value;
  }

  [Symbol.for("Deno.customInspect")](
    inspect: typeof Deno.inspect,
    opts: Deno.InspectOptions & { indentLevel: number; depth: number },
  ) {
    if (
      this instanceof CompoundTag || this instanceof ByteArrayTag ||
      this instanceof IntArrayTag || this instanceof LongArrayTag ||
      this instanceof ListTag && opts.indentLevel >= opts.depth
    ) {
      return inspect(this.#value, opts)
        .replace(this.#value.constructor.name, this.constructor.name);
    } else if (this instanceof ListTag) {
      return `ListTag ${inspect(this.#value, opts)}`;
    } else {
      return `${this.constructor.name}(${inspect(this.#value, opts)})`;
    }
  }
}

export class ByteTag extends Tag<number> {
  constructor(value: number) {
    super(value << 24 >> 24);
  }

  [IO_GET_ID]() {
    return 1;
  }

  [IO_WRITE](writer: TagWriter) {
    writer.writeByte(this.valueOf());
  }

  [NO_UNWRAP](): true {
    return true;
  }
}

export class ShortTag extends Tag<number> {
  constructor(value: number) {
    super(value << 16 >> 16);
  }

  [IO_GET_ID]() {
    return 2;
  }

  [IO_WRITE](writer: TagWriter) {
    writer.writeShort(this.valueOf());
  }

  [NO_UNWRAP](): true {
    return true;
  }
}

export class IntTag extends Tag<number> {
  constructor(value: number) {
    super(value | 0);
  }

  [IO_GET_ID]() {
    return 3;
  }

  [IO_WRITE](writer: TagWriter) {
    writer.writeInt(this.valueOf());
  }

  [NO_UNWRAP](): true {
    return true;
  }
}

export class LongTag extends Tag<bigint> {
  constructor(value: bigint) {
    super(BigInt.asIntN(64, value));
  }

  [IO_GET_ID]() {
    return 4;
  }

  [IO_WRITE](writer: TagWriter) {
    writer.writeLong(this.valueOf());
  }
}

export class FloatTag extends Tag<number> {
  [IO_GET_ID]() {
    return 5;
  }

  [IO_WRITE](writer: TagWriter) {
    writer.writeFloat(this.valueOf());
  }

  [NO_UNWRAP](): true {
    return true;
  }
}

export class DoubleTag extends Tag<number> {
  [IO_GET_ID]() {
    return 6;
  }

  [IO_WRITE](writer: TagWriter) {
    writer.writeDouble(this.valueOf());
  }
}

export class ByteArrayTag extends Tag<Uint8Array> {
  constructor(value: Uint8Array);
  constructor(elements: Iterable<number>);
  constructor(value: Uint8Array | Iterable<number>) {
    super(value instanceof Uint8Array ? value : new Uint8Array(value));
  }

  [IO_GET_ID]() {
    return 7;
  }

  [IO_WRITE](writer: TagWriter) {
    writer.writeByteArray(this.valueOf());
  }

  toList() {
    const list: ByteTag[] = [];
    for (const value of this.valueOf()) list.push(new ByteTag(value));
    return list;
  }
}

export class StringTag extends Tag<string> {
  [IO_GET_ID]() {
    return 8;
  }

  [IO_WRITE](writer: TagWriter) {
    writer.writeString(this.valueOf());
  }
}

export class ListTag<T extends Tag> extends Tag<T[]> {
  constructor(value: T[]);
  constructor(value: Iterable<T>);
  constructor(value: T[] | Iterable<T>) {
    super(value instanceof Array ? value : [...value]);
  }

  [IO_GET_ID]() {
    return 9;
  }

  [IO_WRITE](writer: TagWriter) {
    writer.writeList(this.valueOf());
  }
}

export class CompoundTag extends Tag<Map<string, Tag>> {
  constructor(value?: Record<string, Tag>);
  constructor(value?: Map<string, Tag>);
  constructor(value?: Iterable<[string, Tag]>);
  // deno-lint-ignore no-explicit-any
  constructor(value: any = new Map()) {
    super(
      value instanceof Map
        ? value
        : new Map(value.constructor == Object ? Object.entries(value) : value),
    );
  }

  [IO_GET_ID]() {
    return 10;
  }

  [IO_WRITE](writer: TagWriter) {
    writer.writeCompound(this.valueOf());
  }

  set(key: string, tag: Tag) {
    this.valueOf().set(key, tag);
    return this;
  }

  setByte(key: string, value: number) {
    return this.set(key, new ByteTag(value));
  }

  setShort(key: string, value: number) {
    return this.set(key, new ShortTag(value));
  }

  setInt(key: string, value: number) {
    return this.set(key, new IntTag(value));
  }

  setLong(key: string, value: bigint) {
    return this.set(key, new LongTag(value));
  }

  setFloat(key: string, value: number) {
    return this.set(key, new FloatTag(value));
  }

  setDouble(key: string, value: number) {
    return this.set(key, new DoubleTag(value));
  }

  setByteArray(key: string, value: Uint8Array) {
    return this.set(key, new ByteArrayTag(value));
  }

  setString(key: string, value: string) {
    return this.set(key, new StringTag(value));
  }

  setList<T extends Tag>(key: string, value: T[]): this;
  setList<T extends Tag, C extends TagConstructor<T>>(
    key: string,
    value: TagValue<T>[],
    tagType: C,
  ): this;
  setList<T extends Tag>(
    key: string,
    // deno-lint-ignore no-explicit-any
    value: any[],
    tagType?: TagConstructor<T>,
  ) {
    return this.set(
      key,
      new ListTag(tagType == null ? value : value.map((x) => new tagType(x))),
    );
  }

  setCompound(key: string, value: Record<string, Tag>): this;
  setCompound(key: string, value: Map<string, Tag>): this;
  setCompound(key: string, value: Iterable<[string, Tag]>): this;
  // deno-lint-ignore no-explicit-any
  setCompound(key: string, value: any) {
    return this.set(key, new CompoundTag(value));
  }

  setIntArray(key: string, value: Int32Array) {
    return this.set(key, new IntArrayTag(value));
  }

  setLongArray(key: string, value: BigInt64Array) {
    return this.set(key, new LongArrayTag(value));
  }

  setBoolean(key: string, value: boolean) {
    return this.setByte(key, Number(value));
  }

  get(key: string) {
    return this.valueOf().get(key);
  }

  getByte(key: string) {
    return this.#getTag(key, ByteTag)?.valueOf();
  }

  getShort(key: string) {
    return this.#getTag(key, ShortTag)?.valueOf();
  }

  getInt(key: string) {
    return this.#getTag(key, IntTag)?.valueOf();
  }

  getLong(key: string) {
    return this.#getTag(key, LongTag)?.valueOf();
  }

  getFloat(key: string) {
    return this.#getTag(key, FloatTag)?.valueOf();
  }

  getDouble(key: string) {
    return this.#getTag(key, DoubleTag)?.valueOf();
  }

  getByteArray(key: string) {
    return this.#getTag(key, ByteArrayTag)?.valueOf();
  }

  getString(key: string) {
    return this.#getTag(key, StringTag)?.valueOf();
  }

  getList<T extends Tag>(
    key: string,
    tagType: TagConstructor<T>,
  ): T[] | null {
    const list = this.#getTag(key, ListTag)?.valueOf();
    if (list == null) return null;
    for (const tag of list) ensureTagType(tag, tagType);
    return list as T[];
  }

  getCompoundTag(key: string) {
    return this.#getTag(key, CompoundTag);
  }

  getIntArray(key: string) {
    return this.#getTag(key, IntArrayTag)?.valueOf();
  }

  getLongArray(key: string) {
    return this.#getTag(key, LongArrayTag)?.valueOf();
  }

  getBoolean(key: string) {
    return Boolean(this.getByte(key));
  }

  has(key: string) {
    this.valueOf().entries;
    return this.valueOf().has(key);
  }

  #getTag<T extends Tag>(
    key: string,
    constructor: TagConstructor<T>,
  ): T | null {
    const tag = this.get(key);
    if (tag == null) return null;
    return ensureTagType(tag, constructor);
  }
}

export class IntArrayTag extends Tag<Int32Array> {
  constructor(value: Int32Array);
  constructor(elements: Iterable<number>);
  constructor(value: Int32Array | Iterable<number>) {
    super(value instanceof Int32Array ? value : new Int32Array(value));
  }

  [IO_GET_ID]() {
    return 11;
  }

  [IO_WRITE](writer: TagWriter) {
    writer.writeIntArray(this.valueOf());
  }

  toList() {
    const list: IntTag[] = [];
    for (const value of this.valueOf()) list.push(new IntTag(value));
    return list;
  }
}

export class LongArrayTag extends Tag<BigInt64Array> {
  constructor(value: BigInt64Array);
  constructor(elements: Iterable<bigint>);
  constructor(value: BigInt64Array | Iterable<bigint>) {
    super(value instanceof BigInt64Array ? value : new BigInt64Array(value));
  }

  [IO_GET_ID]() {
    return 12;
  }

  [IO_WRITE](writer: TagWriter) {
    writer.writeLongArray(this.valueOf());
  }

  toList() {
    const list: LongTag[] = [];
    for (const value of this.valueOf()) list.push(new LongTag(value));
    return list;
  }
}

// deno-lint-ignore no-explicit-any
type TagConstructor<T extends Tag> = new (...args: any[]) => T;
type TagValue<T extends Tag> = ReturnType<T["valueOf"]>;

function ensureTagType<T extends Tag>(
  tag: Tag,
  constructor: TagConstructor<T>,
) {
  if (tag instanceof constructor) return tag;
  throw new Error(
    `Expected ${constructor.name} but got ${tag.constructor.name}`,
  );
}
