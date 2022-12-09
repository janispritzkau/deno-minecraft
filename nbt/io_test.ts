import { assertEquals, assertThrows } from "https://deno.land/std@0.167.0/testing/asserts.ts";
import { ByteTag, CompoundTag, ShortTag, Tag } from "./tag.ts";
import { decodeCompoundTag, encodeCompoundTag } from "./io.ts";

Deno.test("encode compound tag", () => {
  assertEquals(encodeCompoundTag(null), new Uint8Array([0]));

  assertEquals(
    encodeCompoundTag(new CompoundTag()),
    new Uint8Array([10, 0, 0, 0]),
  );

  assertEquals(
    encodeCompoundTag(new CompoundTag().setByte("byte", -1)),
    new Uint8Array([10, 0, 0, 1, 0, 4, 98, 121, 116, 101, 255, 0]),
  );

  assertThrows(() =>
    encodeCompoundTag(new CompoundTag()
      .setList<Tag>("list", [new ByteTag(0), new ShortTag(0)]))
  );
});

Deno.test("decode compound tag", () => {
  assertEquals(decodeCompoundTag(new Uint8Array([0])), null);

  assertEquals(
    decodeCompoundTag(new Uint8Array([10, 0, 0, 0])),
    new CompoundTag(),
  );

  assertThrows(() => decodeCompoundTag(new Uint8Array()));
  assertThrows(() => decodeCompoundTag(new Uint8Array([1, 0, 0, 255])));
});
