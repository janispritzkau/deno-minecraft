import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.161.0/testing/asserts.ts";

import { Reader, Writer } from "./mod.ts";

Deno.test("write grow", () => {
  const writer = new Writer(new Uint8Array());
  writer.write(new Uint8Array(3));
  assertEquals(writer.bytes().buffer.byteLength, 0 * 2 + 3);
  writer.write(new Uint8Array(2));
  assertEquals(writer.bytes().buffer.byteLength, 3 * 2 + 2);
});

Deno.test("read out of bounds", () => {
  assertThrows(() => {
    new Reader(new Uint8Array(1)).readShort();
  });

  assertThrows(() => {
    new Reader(new Uint8Array(9)).read(10);
  });
});

Deno.test("write signed", () => {
  assertEquals(
    new Writer().writeShort(-1).bytes(),
    new Uint8Array([255, 255]),
  );
});

Deno.test("write unsigned", () => {
  assertEquals(
    new Writer().writeShort(0xffff).bytes(),
    new Uint8Array([255, 255]),
  );
});

Deno.test("read string too long", () => {
  new Reader(
    new Writer().writeString("this is fine").bytes(),
  ).readString(12);

  assertThrows(() => {
    new Reader(
      new Writer().writeString("this is too long").bytes(),
    ).readString(12);
  });
});

Deno.test("write and read varint", () => {
  const values = [0, 127, 255, -1];
  const encodedValues = [[0], [127], [255, 1], [255, 255, 255, 255, 15]];

  for (let i = 0; i < values.length; i++) {
    const encoded = new Writer().writeVarInt(values[i]).bytes();
    assertEquals(encoded, new Uint8Array(encodedValues[i]));
    assertEquals(new Reader(encoded).readVarInt(), values[i]);
  }
});

Deno.test("read varint too long", () => {
  assertThrows(() => new Reader(new Uint8Array(5).fill(255)).readVarInt());
});

Deno.test("write and read varlong", () => {
  const values = [
    2147483647n,
    -1n,
  ];

  const encodedValues = [
    [255, 255, 255, 255, 7],
    [...Array(9).fill(255), 1],
  ];

  for (let i = 0; i < values.length; i++) {
    const encoded = new Writer().writeVarLong(values[i]).bytes();
    assertEquals(encoded, new Uint8Array(encodedValues[i]));
    assertEquals(new Reader(encoded).readVarLong(), values[i]);
  }
});

Deno.test("read varlong too long", () => {
  assertThrows(() => new Reader(new Uint8Array(10).fill(255)).readVarLong());
});
