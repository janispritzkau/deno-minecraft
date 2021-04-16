import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std/testing/asserts.ts";

import { PacketReader, PacketWriter } from "./packet.ts";
import { CompoundTag } from "../nbt/tag.ts";

Deno.test("write grow", () => {
  const writer = new PacketWriter(new Uint8Array());
  writer.write(new Uint8Array(3));
  assertEquals(writer.getBuf().length, 0 * 2 + 3);
  writer.write(new Uint8Array(2));
  assertEquals(writer.getBuf().length, 3 * 2 + 2);
});

Deno.test("read out of bounds", () => {
  assertThrows(() => {
    new PacketReader(new Uint8Array(1)).readShort();
  });

  assertThrows(() => {
    new PacketReader(new Uint8Array(9)).read(10);
  });
});

Deno.test("write signed", () => {
  assertEquals(
    new PacketWriter().writeShort(-1).bytes(),
    new Uint8Array([255, 255]),
  );
});

Deno.test("write unsigned", () => {
  assertEquals(
    new PacketWriter().writeShort(0xffff).bytes(),
    new Uint8Array([255, 255]),
  );
});

Deno.test("read string too long", () => {
  new PacketReader(
    new PacketWriter().writeString("this is fine").bytes(),
  ).readString(12);

  assertThrows(() => {
    new PacketReader(
      new PacketWriter().writeString("this is too long").bytes(),
    ).readString(12);
  });
});

Deno.test("varint", () => {
  const values = [0, 127, 255, -1];
  const encodedValues = [[0], [127], [255, 1], [255, 255, 255, 255, 15]];

  for (let i = 0; i < values.length; i++) {
    const encoded = new PacketWriter().writeVarInt(values[i]).bytes();
    assertEquals(encoded, new Uint8Array(encodedValues[i]));
    assertEquals(new PacketReader(encoded).readVarInt(), values[i]);
  }
});

Deno.test("read varint too long", () => {
  assertThrows(() =>
    new PacketReader(new Uint8Array(5).fill(255)).readVarInt()
  );
});

Deno.test("varlong", () => {
  const values = [
    2147483647n,
    -1n,
  ];

  const encodedValues = [
    [255, 255, 255, 255, 7],
    [...Array(9).fill(255), 1],
  ];

  for (let i = 0; i < values.length; i++) {
    const encoded = new PacketWriter().writeVarLong(values[i]).bytes();
    assertEquals(encoded, new Uint8Array(encodedValues[i]));
    assertEquals(new PacketReader(encoded).readVarLong(), values[i]);
  }
});

Deno.test("read varlong too long", () => {
  assertThrows(() =>
    new PacketReader(new Uint8Array(10).fill(255)).readVarLong()
  );
});

Deno.test("nbt", () => {
  const tag = new CompoundTag().setString("hello", "world");

  const buf = new PacketWriter()
    .writeNBT(tag)
    .writeByte(-1)
    .bytes();

  const reader = new PacketReader(buf);

  assertEquals(reader.readNBT(), tag);
  assertEquals(reader.readByte(), -1);
});
