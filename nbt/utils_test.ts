import {
  assert,
  assertEquals,
  assertInstanceOf,
} from "https://deno.land/std@0.161.0/testing/asserts.ts";

import {
  ByteArrayTag,
  CompoundTag,
  IntTag,
  ListTag,
  LongArrayTag,
  ShortTag,
  StringTag,
} from "./tag.ts";
import { equals, fromValue, toValue } from "./utils.ts";

Deno.test("equals", () => {
  assert(equals(new IntTag(2), new IntTag(2)));
  assert(!equals(new StringTag("foo"), new StringTag("bar")));
  assert(!equals(new ByteArrayTag([1]), new ByteArrayTag([0])));
  assert(equals(new LongArrayTag([-1n]), new LongArrayTag([-1n])));
  assert(equals(new CompoundTag(), new CompoundTag()));
  assert(!equals(new CompoundTag({ x: new IntTag(0) }), new CompoundTag()));
  assert(!equals(new CompoundTag(), new CompoundTag({ x: new IntTag(0) })));
  assert(
    !equals(
      new CompoundTag({ x: new IntTag(1) }),
      new CompoundTag({ x: new IntTag(2) }),
    ),
  );
  assert(
    equals(
      new CompoundTag({ a: new ShortTag(1), b: new ListTag([]) }),
      new CompoundTag({ a: new ShortTag(1), b: new ListTag([]) }),
    ),
  );
  assert(
    equals(
      new ListTag([new StringTag("same")]),
      new ListTag([new StringTag("same")]),
    ),
  );
  assert(
    !equals(
      new ListTag([new StringTag("not")]),
      new ListTag([new StringTag("same")]),
    ),
  );
  assert(!equals(new ListTag([]), new ListTag([new IntTag(0)])));
  assert(!equals(new ListTag([new IntTag(0)]), new ListTag([])));
});

Deno.test("convert tag value", () => {
  const tag = fromValue({
    nested: {
      list: [
        { foo: new StringTag("bar") },
      ],
    },
  });
  assertInstanceOf(tag, CompoundTag);
  assertEquals(toValue(tag).nested.list[0].foo, "bar");
});
