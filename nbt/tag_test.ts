import { assertEquals } from "https://deno.land/std@0.161.0/testing/asserts.ts";

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
} from "./tag.ts";

Deno.test("tag constructors", () => {
  assertEquals(new ByteTag(255).valueOf(), -1);
  assertEquals(new ShortTag(65535).valueOf(), -1);
  assertEquals(new IntTag(4294967295).valueOf(), -1);
  assertEquals(new LongTag(18446744073709551615n).valueOf(), -1n);
  assertEquals(new FloatTag(0.1 + 0.2).valueOf(), 0.1 + 0.2);
  assertEquals(new DoubleTag(0.1 + 0.2).valueOf(), 0.1 + 0.2);
  assertEquals(new ByteArrayTag(new Uint8Array([1])), new ByteArrayTag([1]));
  assertEquals(new StringTag("hello").valueOf(), "hello");
  assertEquals(new ListTag([new IntTag(0)]).valueOf(), [new IntTag(0)]);
  assertEquals(new ListTag([].values()).valueOf(), []);

  const tag = new CompoundTag({ foo: new StringTag("bar") });
  assertEquals(new CompoundTag(new Map([["foo", new StringTag("bar")]])), tag);
  assertEquals(new CompoundTag([["foo", new StringTag("bar")]]), tag);

  assertEquals(
    new IntArrayTag(new Int32Array([1])),
    new IntArrayTag([1].values()),
  );
  assertEquals(
    new LongArrayTag(new BigInt64Array([1n])),
    new LongArrayTag([1n].values()),
  );
});

Deno.test("compound tag", () => {
  assertEquals(
    new CompoundTag().set("nested", new CompoundTag()),
    new CompoundTag({ nested: new CompoundTag() }),
  );

  assertEquals(
    new CompoundTag().setList("foo", [new StringTag("bar")]),
    new CompoundTag({ foo: new ListTag([new StringTag("bar")]) }),
  );

  assertEquals(
    new CompoundTag().setList("x", [255], ByteTag),
    new CompoundTag({ x: new ListTag([new ByteTag(-1)]) }),
  );

  assertEquals(
    new CompoundTag().setCompound("data", { x: new IntTag(1) }),
    new CompoundTag({ data: new CompoundTag({ x: new IntTag(1) }) }),
  );

  assertEquals(
    new CompoundTag({
      foo: new ListTag([new ListTag([new StringTag("bar")])]),
    })
      .getList("foo", ListTag),
    [[new StringTag("bar")]],
  );

  assertEquals(
    new CompoundTag({ list: new ListTag([new IntTag(1)]) })
      .getListTag("list", IntTag),
    new ListTag([new IntTag(1)]),
  );

  const compound = new CompoundTag()
    .setByte("Byte", 1)
    .setShort("Short", 1)
    .setInt("Int", 1)
    .setLong("Long", 1n)
    .setFloat("Float", 1)
    .setDouble("Double", 1)
    .setByteArray("ByteArray", new Uint8Array([1]))
    .setString("String", "hello")
    .setList("List", [new ByteTag(-1)])
    .setCompound("Compound", {})
    .setIntArray("IntArray", new Int32Array([1]))
    .setLongArray("LongArray", new BigInt64Array([1n]))
    .setBoolean("Boolean", false);

  assertEquals(compound.getByte("Byte"), 1);
  assertEquals(compound.getShort("Short"), 1);
  assertEquals(compound.getInt("Int"), 1);
  assertEquals(compound.getLong("Long"), 1n);
  assertEquals(compound.getFloat("Float"), 1);
  assertEquals(compound.getDouble("Double"), 1);
  assertEquals(compound.getByteArray("ByteArray"), new Uint8Array([1]));
  assertEquals(compound.getString("String"), "hello");
  assertEquals(compound.getList("List", ByteTag), [-1]);
  assertEquals(compound.getCompoundTag("Compound"), new CompoundTag());
  assertEquals(compound.getIntArray("IntArray"), new Int32Array([1]));
  assertEquals(compound.getLongArray("LongArray"), new BigInt64Array([1n]));
  assertEquals(compound.getBoolean("Boolean"), false);
});
