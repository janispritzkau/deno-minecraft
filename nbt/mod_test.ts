import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std/testing/asserts.ts";

import { NBTWriter } from "./writer.ts";
import { NBTReader } from "./reader.ts";

import {
  ByteArrayTag,
  ByteTag,
  CompoundTag,
  decodeCompoundTag,
  DoubleTag,
  encodeCompoundTag,
  FloatTag,
  IntArrayTag,
  IntTag,
  ListTag,
  LongArrayTag,
  LongTag,
  ShortTag,
  StringTag,
  Tag,
} from "./mod.ts";

function testTag(tag: Tag, expectedLength: number) {
  const buf = new NBTWriter().writeTag(tag).bytes();
  assertEquals(
    buf.length,
    expectedLength,
    "encoded length does not match expected length",
  );
  assertEquals(new NBTReader(buf).readTag(tag.getId()), tag);
}

Deno.test("nbt tags", () => {
  testTag(new ByteTag(1), 1);
  testTag(new ShortTag(1), 2);
  testTag(new IntTag(1), 4);
  testTag(new LongTag(1n), 8);
  testTag(new FloatTag(1), 4);
  testTag(new DoubleTag(1), 8);
  testTag(new ByteArrayTag(new Uint8Array(16)), 20);
  testTag(new StringTag("test"), 6);
  testTag(new ListTag([new CompoundTag()]), 6);
  testTag(new CompoundTag(), 1);
  testTag(new IntArrayTag(new Int32Array(4)), 20);
  testTag(new LongArrayTag(new BigInt64Array(2)), 20);
});

Deno.test("encode compound tag", () => {
  assertEquals(
    encodeCompoundTag(null),
    new Uint8Array([0]),
  );

  assertEquals(
    encodeCompoundTag(new CompoundTag()),
    new Uint8Array([10, 0, 0, 0]),
  );

  assertEquals(
    encodeCompoundTag(new CompoundTag().setByte("byte", -1)),
    new Uint8Array([10, 0, 0, 1, 0, 4, 98, 121, 116, 101, 255, 0]),
  );
});

Deno.test("decode compound tag", () => {
  assertEquals(decodeCompoundTag(new Uint8Array([0])), null);

  assertEquals(
    decodeCompoundTag(new Uint8Array([10, 0, 0, 0])),
    new CompoundTag(),
  );

  // empty buffer
  assertThrows(() => decodeCompoundTag(new Uint8Array()));

  // wrong root tag type
  assertThrows(() => decodeCompoundTag(new Uint8Array([1, 0, 0, 255])));
});

Deno.test("encode list tag must be of same type", () => {
  assertThrows(() => {
    new NBTWriter().writeList([new ByteTag(1), new ShortTag(1)]);
  });
});
