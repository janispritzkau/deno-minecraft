import { assert, assertEquals } from "https://deno.land/std@0.167.0/testing/asserts.ts";
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
import { equals, unwrap, wrap } from "./utils.ts";

const WRAPPED_TAGS = [
  new ByteTag(1),
  new ShortTag(2),
  new IntTag(3),
  new FloatTag(4),
];

const VALUE_TAGS = [
  new LongTag(0n),
  new DoubleTag(0),
  new ByteArrayTag(new Uint8Array()),
  new StringTag(""),
  new IntArrayTag(new Int32Array()),
  new LongArrayTag(new BigInt64Array()),
];

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

Deno.test("wrap tag", () => {
  for (const x of WRAPPED_TAGS) {
    assertEquals(wrap(x), x);
  }

  for (const x of VALUE_TAGS) {
    assertEquals(wrap(x.valueOf()), x);
  }

  assertEquals(wrap(["hello"]), new ListTag([new StringTag("hello")]));

  assertEquals(
    wrap([{
      foo: new ByteTag(-1),
      bar: "baz",
    }]),
    new ListTag([
      new CompoundTag({
        foo: new ListTag([new ByteTag(-1)]),
        bar: new StringTag("baz"),
      }),
    ]),
  );

  assertEquals(wrap(false), new ByteTag(0))
  assertEquals(wrap(true), new ByteTag(1))
});

Deno.test("unwrap tag", () => {
  for (const tag of WRAPPED_TAGS) {
    assertEquals(unwrap(tag), tag);
    assertEquals(unwrap(new ListTag([tag])), [tag]);
  }

  for (const tag of VALUE_TAGS) {
    assertEquals(unwrap(tag), tag.valueOf());
    assertEquals(unwrap(new ListTag([tag])), [tag.valueOf()]);
  }

  assertEquals(
    unwrap(
      new ListTag([
        new CompoundTag({
          foo: new ListTag([new ByteTag(-1)]),
          bar: new StringTag("baz"),
        }),
      ]),
    ),
    [
      {
        foo: [new ByteTag(-1)],
        bar: "baz",
      },
    ],
  );

  unwrap(new ListTag([new ByteArrayTag([]), new StringTag("")]));
});
