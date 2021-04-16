// deno-lint-ignore-file

import {
  assert,
  assertEquals,
  assertThrowsAsync,
} from "https://deno.land/std/testing/asserts.ts";

import { Connection } from "./connection.ts";
import { PacketWriter } from "./packet.ts";

const BUF_CAPACITY = 1024;

Deno.test("read zero packet length", async () => {
  const conn = fakeReaderConn((function* () {
    yield new Uint8Array([0]);
  })());

  await assertThrowsAsync(() => conn.receive());
});

Deno.test("read invalid packet length", async () => {
  let gotToEnd = false;
  const conn = fakeReaderConn((function* () {
    yield new Uint8Array(5).fill(255);
    yield new Uint8Array();
    gotToEnd = true;
  })());

  await assertThrowsAsync(() => conn.receive());
  assert(!gotToEnd);
});

Deno.test("read packet too big", async () => {
  const conn = fakeReaderConn((function* () {
    const len = new PacketWriter().writeVarInt(BUF_CAPACITY).bytes();
    yield len;
    yield new Uint8Array(BUF_CAPACITY - len.length);
  })());

  await assertThrowsAsync(() => conn.receive());
});

Deno.test("read one packet with multiple read calls", async () => {
  const buf = new Uint8Array(300).map((_, i) => i % 256);

  const conn = fakeReaderConn((function* () {
    const len = new PacketWriter().writeVarInt(300).bytes();
    yield len.slice(0, 1);
    yield len.slice(1, 2);
    yield buf.subarray(0, 50);
    yield buf.subarray(50, 300);
  })());

  assertEquals(await conn.receive(), buf);
  assertEquals(await conn.receive(), null);
});

Deno.test("read multiple packets with one read call", async () => {
  const a = new Uint8Array(100).fill(1);
  const b = new Uint8Array(200).fill(2);

  const conn = fakeReaderConn((function* () {
    yield new PacketWriter()
      .writeVarInt(a.length).write(a)
      .writeVarInt(b.length).write(b)
      .bytes();
  })());

  assertEquals(await conn.receive(), a);
  assertEquals(await conn.receive(), b);
  assertEquals(await conn.receive(), null);
});

Deno.test("write packet", async () => {
  let timesCalledWrite = 0;
  let writeBuf: Uint8Array | undefined;

  const conn = new Connection({
    async write(buf) {
      timesCalledWrite++;
      writeBuf = buf;
      return buf.length;
    },
    async read() {
      return null;
    },
    close() {},
  });

  await conn.send(new Uint8Array([0]));
  assertEquals(timesCalledWrite, 1);
  assertEquals(writeBuf, new Uint8Array([1, 0]));
});

Deno.test("write packet under compression threshold", async () => {
  let timesCalledWrite = 0;
  let writeBuf: Uint8Array | undefined;

  const conn = new Connection({
    async write(buf) {
      timesCalledWrite++;
      writeBuf = buf;
      return buf.length;
    },
    async read() {
      return null;
    },
    close() {},
  });

  conn.setCompression(128);

  await conn.send(new Uint8Array([0]));
  assertEquals(timesCalledWrite, 1);
  assertEquals(writeBuf, new Uint8Array([2, 0, 0]));
});

Deno.test("write packet over compression threshold", async () => {
  let timesCalledWrite = 0;
  let writeBuf: Uint8Array | undefined;

  const conn = new Connection({
    async write(buf) {
      timesCalledWrite++;
      writeBuf = buf;
      return buf.length;
    },
    async read() {
      return null;
    },
    close() {},
  });

  conn.setCompression(128);

  await conn.send(new Uint8Array(128));
  assertEquals(timesCalledWrite, 1);
  assertEquals(
    writeBuf,
    new Uint8Array([14, 128, 1, 120, 156, 99, 96, 24, 88, 0, 0, 0, 128, 0, 1]),
  );
});

function fakeReaderConn(generator: Generator<Uint8Array>) {
  return new Connection({
    async write() {
      return 0;
    },
    async read(buf) {
      const result = generator.next();
      if (result.done) return null;
      buf.set(result.value);
      return Promise.resolve(result.value.length);
    },
    close() {},
  }, BUF_CAPACITY);
}
