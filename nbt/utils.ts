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

export function equals(a: Tag, b: Tag): boolean {
  if (a.constructor != b.constructor) {
    return false;
  } else if (a instanceof CompoundTag && b instanceof CompoundTag) {
    for (const k of a.valueOf().keys()) if (!b.has(k)) return false;
    for (const k of b.valueOf().keys()) {
      if (!a.has(k)) return false;
      if (!equals(a.get(k)!, b.get(k)!)) return false;
    }
    return true;
  } else if (a instanceof ListTag && b instanceof ListTag) {
    if (a.valueOf().length != b.valueOf().length) return false;
    for (let i = 0; i < a.valueOf().length; i++) {
      if (!equals(a.valueOf()[i], b.valueOf()[i])) return false;
    }
    return true;
  } else if (a instanceof ByteArrayTag && b instanceof ByteArrayTag) {
    return equals(new ListTag(a.toList()), new ListTag(b.toList()));
  } else if (a instanceof IntArrayTag && b instanceof IntArrayTag) {
    return equals(new ListTag(a.toList()), new ListTag(b.toList()));
  } else if (a instanceof LongArrayTag && b instanceof LongArrayTag) {
    return equals(new ListTag(a.toList()), new ListTag(b.toList()));
  } else {
    return a.valueOf() == b.valueOf();
  }
}

/**
 * **UNSTABLE**
 */
// deno-lint-ignore no-explicit-any
export function toValue(tag: Tag): any {
  if (tag instanceof ListTag) return tag.valueOf().map(toValue);
  if (
    tag instanceof ByteTag || tag instanceof ShortTag ||
    tag instanceof IntTag || tag instanceof FloatTag
  ) return tag;
  if (!(tag instanceof CompoundTag)) return tag.valueOf() as unknown;
  const obj: Record<string, unknown> = {};
  for (const [key, value] of tag.valueOf()) obj[key] = toValue(value);
  return obj;
}

export function fromValue(value: unknown): Tag {
  if (value instanceof Tag) return value;
  if (value && value.constructor == Object) {
    const map = new Map<string, Tag>();
    for (const k in <Record<string, unknown>> value) {
      map.set(k, fromValue((value as Record<string, unknown>)[k]));
    }
    return new CompoundTag(map);
  }
  if (value instanceof Array) {
    return new ListTag(value.map((x) => fromValue(x)));
  }
  if (typeof value == "string") return new StringTag(value);
  if (typeof value == "number") return new DoubleTag(value);
  if (typeof value == "bigint") return new LongTag(value);
  if (value instanceof Uint8Array) return new ByteArrayTag(value);
  if (value instanceof Int32Array) return new IntArrayTag(value);
  if (value instanceof BigInt64Array) return new LongArrayTag(value);
  throw new Error("Invalid value");
}
