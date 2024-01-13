import {
  ByteArrayTag,
  ByteTag,
  CompoundTag,
  DoubleTag,
  IntArrayTag,
  ListTag,
  LongArrayTag,
  LongTag,
  StringTag,
  Tag,
} from "./tag.ts";
import { NO_UNWRAP } from "./_tag.ts";

/**
 * Checks if two tags are equal in value.
 */
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
 * Constructs tags by inferring the tag type from the value and wrapping it in
 * a tag class. Object and array types are converted recursively.
 */
export function wrap<T extends TagValue>(value: T): WrapValue<T>;
export function wrap(value: TagValue): Tag {
  if (value instanceof Tag) return value;
  if (value instanceof Uint8Array) return new ByteArrayTag(value);
  if (value instanceof Int32Array) return new IntArrayTag(value);
  if (value instanceof BigInt64Array) return new LongArrayTag(value);
  if (value instanceof Array) return new ListTag(value.map((x) => wrap(x)));
  if (typeof value == "object" && value.constructor == Object) {
    const map = new Map<string, Tag>();
    for (const key in value) map.set(key, wrap(value[key]));
    return new CompoundTag(map);
  }
  if (typeof value == "string") return new StringTag(value);
  if (typeof value == "number") return new DoubleTag(value);
  if (typeof value == "boolean") return new ByteTag(+value);
  if (typeof value == "bigint") return new LongTag(value);
  throw new Error("Invalid value");
}

/**
 * Converts tags to a simpler representation using plain objects and arrays,
 * unwrapping the inner tag value where possible.
 */
export function unwrap<T extends Tag>(tag: T): UnwrapTag<T>;
export function unwrap(tag: Tag): UnwrapTag<Tag> {
  if (tag[NO_UNWRAP]()) return tag;
  if (tag instanceof ListTag) return (tag.valueOf() as Tag[]).map(unwrap);
  if (!(tag instanceof CompoundTag)) return tag.valueOf() as TagValue;
  const obj: Record<string, TagValue> = {};
  for (const [key, value] of tag.valueOf()) obj[key] = unwrap(value);
  return obj;
}

type TagValue =
  | string
  | number
  | boolean
  | bigint
  | Uint8Array
  | Int32Array
  | BigInt64Array
  | Array<TagValue>
  | CompoundValue
  | Tag;

interface CompoundValue {
  [key: string]: TagValue;
}

type WrapValue<T> = T extends Tag
  ? T
  : T extends Record<string, TagValue>
  ? CompoundTag
  : T extends Array<infer V>
  ? ListTag<WrapValue<V>>
  : T extends string
  ? StringTag
  : T extends number
  ? DoubleTag
  : T extends boolean
  ? ByteTag
  : T extends bigint
  ? LongTag
  : T extends Uint8Array
  ? ByteArrayTag
  : T extends Int32Array
  ? IntArrayTag
  : T extends BigInt64Array
  ? LongArrayTag
  : Tag;

type UnwrapTag<T extends Tag> = ReturnType<T[typeof NO_UNWRAP]> extends true
  ? T
  : UnwrapTagValueOf<ReturnType<T["valueOf"]>>;

type UnwrapTagValueOf<T> = T extends Map<string, Tag>
  ? Record<string, TagValue>
  : T extends Array<infer V extends Tag>
  ? UnwrapTag<V>[]
  : T extends unknown
  ? TagValue
  : T;
