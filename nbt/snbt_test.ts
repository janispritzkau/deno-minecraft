import {
  assertEquals,
  assertInstanceOf,
  assertThrows,
} from "https://deno.land/std@0.167.0/testing/asserts.ts";
import { parse, stringify } from "./snbt.ts";
import { ByteTag, DoubleTag, FloatTag, IntTag, LongTag, ShortTag, StringTag } from "./tag.ts";

const SNBT_TEST = String.raw`
{
  "quoted key": unquoted_string,
  unquoted_key: 'single quote string',
  'esc\'ape': "{\"key\":\"value\"}",
  skip  :  whitespace  ," ":{nested:{ compound: {}} , },
  book: ["page 1", page-2, 'page 3'],
  numbers:{
    byteArray: [B; -128b, 127B, +1B, -0b],
    intArray: [I;0 , -0,+100 ,-109,],
    longArray:[L;1234567890L,-1l, ],
    doubles: [0.0, 2d, +2.50, 1.5E3, 42.e-10, 1E6d, -9.998D],
    floats: [0.672f, -4.123e-5F, +2f, 0F],
    short: 32767S,
    byte_boolean: [true, false, 1b, 0b],
  }
}
`;

Deno.test("parse and stringify", () => {
  const tag = parse(SNBT_TEST);
  assertEquals(parse(stringify(tag)), tag);
});

Deno.test("parse strings", () => {
  assertEquals(parse(".+-_"), new StringTag(".+-_"));
  assertEquals(parse(`'\\''`), new StringTag("'"));
  assertEquals(parse(`"\\""`), new StringTag('"'));
  assertEquals(parse(`"\\\\"`), new StringTag("\\"));
  assertThrows(() => parse(`'\\"'`));
  assertThrows(() => parse(`"\\'"`));
  assertThrows(() => parse(`"\\n"`));
});

Deno.test("parse integers", () => {
  assertEquals(parse("127b"), new ByteTag(127));
  assertEquals(parse("128b"), new StringTag("128b"));
  assertEquals(parse("-128b"), new ByteTag(-128));
  assertEquals(parse("-129b"), new StringTag("-129b"));
  assertEquals(parse("-32768s"), new ShortTag(-32768));
  assertEquals(parse("+2147483647"), new IntTag(2147483647));
  assertEquals(parse("2147483648"), new StringTag("2147483648"));
  assertEquals(parse("-1L"), new LongTag(-1n));
  assertInstanceOf(parse("9223372036854775808L"), StringTag);
});

Deno.test("parse strings and numbers", () => {
  assertEquals(parse("-"), new StringTag("-"));
  assertEquals(parse("-1"), new IntTag(-1));
  assertEquals(parse("-1."), new DoubleTag(-1));
  assertEquals(parse("-1.e"), new StringTag("-1.e"));
  assertEquals(parse("-1.e-1"), new DoubleTag(-1e-1));
  assertEquals(parse("-1.E-10"), new DoubleTag(-1e-10));
  assertEquals(parse("+1.5e-10f"), new FloatTag(1.5e-10));
  assertEquals(parse("+1.e-10fd"), new StringTag("+1.e-10fd"));
  assertEquals(parse("   .1"), new DoubleTag(0.1));
  assertEquals(parse(".1E1F"), new FloatTag(1));
});

Deno.test("parse booleans", () => {
  assertEquals(parse("false"), new ByteTag(0));
  assertEquals(parse("TruE"), new ByteTag(1));
});

Deno.test("parse unexpected", () => {
  assertThrows(() => parse("!"));
  assertThrows(() => parse(`"`));
  assertThrows(() => parse(`'`));
  assertThrows(() => parse(`'\\`));
  assertThrows(() => parse("["));
  assertThrows(() => parse("[}"));
  assertThrows(() => parse("{"));
  assertThrows(() => parse("{]"));
  assertThrows(() => parse("hello!"));
  assertThrows(() => parse("[hello!]"));
  assertThrows(() => parse("{foo:bar!}"));
  assertThrows(() => parse("{}1"));
});
