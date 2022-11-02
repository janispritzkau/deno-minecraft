// deno-lint-ignore-file

import {
  assert,
  assertEquals,
  assertThrowsAsync,
} from "https://deno.land/std@0.104.0/testing/asserts.ts";

import { Writer } from "../io/mod.ts";
import { Packet } from "./packet.ts";
import { Protocol } from "./protocol.ts";
import { Connection, MAX_PACKET_LEN } from "./connection.ts";

Deno.test("read zero packet length", async () => {
  const conn = fakeReaderConn((function* () {
    yield new Uint8Array([0]);
  })());

  await assertThrowsAsync(() => conn.receiveRaw());
});

Deno.test("read invalid packet length", async () => {
  let gotToEnd = false;
  const conn = fakeReaderConn((function* () {
    yield new Uint8Array(5).fill(255);
    yield new Uint8Array();
    gotToEnd = true;
  })());

  await assertThrowsAsync(() => conn.receiveRaw());
  assert(!gotToEnd);
});

Deno.test("read packet too big", async () => {
  const conn = fakeReaderConn((function* () {
    const len = new Writer().writeVarInt(MAX_PACKET_LEN).bytes();
    yield len;
    yield new Uint8Array(MAX_PACKET_LEN - len.length);
  })());

  await assertThrowsAsync(() => conn.receiveRaw());
});

Deno.test("read one packet with multiple read calls", async () => {
  const buf = new Uint8Array(256).map((_, i) => i % 256);

  const conn = fakeReaderConn((function* () {
    const len = new Writer().writeVarInt(256).bytes();
    yield len.slice(0, 1);
    yield len.slice(1, 2);
    yield buf.subarray(0, 50);
    yield buf.subarray(50, 256);
  })());

  assertEquals(await conn.receiveRaw(), buf);
  assertEquals(await conn.receiveRaw(), null);
});

Deno.test("read multiple packets with one read call", async () => {
  const a = new Uint8Array(4).fill(1);
  const b = new Uint8Array(8).fill(2);

  const conn = fakeReaderConn((function* () {
    yield new Writer()
      .writeVarInt(a.length).write(a)
      .writeVarInt(b.length).write(b)
      .bytes();
  })());

  assertEquals(await conn.receiveRaw(), a);
  assertEquals(await conn.receiveRaw(), b);
  assertEquals(await conn.receiveRaw(), null);
});

Deno.test("write packet", async () => {
  let timesCalledWrite = 0;
  let writeBuf: Uint8Array | undefined;

  const conn = new Connection({
    ...fakeConn,
    async write(buf) {
      timesCalledWrite++;
      writeBuf = buf;
      return buf.length;
    },
  });

  await conn.sendRaw(new Uint8Array([0]));
  assertEquals(timesCalledWrite, 1);
  assertEquals(writeBuf, new Uint8Array([1, 0]));
});

Deno.test("set protocol", async () => {
  let timesServerHandlerCalled = 0;
  let timesClientHandlerCalled = 0;

  class ServerPacket implements Packet<void> {
    static read() {
      return new this();
    }
    write() {}
    async handle() {
      timesServerHandlerCalled++;
    }
  }

  class ClientPacket implements Packet<void> {
    static read() {
      return new this();
    }
    write() {}
    async handle() {
      timesClientHandlerCalled++;
    }
  }

  const protocol = new Protocol();
  protocol.registerServerbound(0, ServerPacket);
  protocol.registerClientbound(0, ClientPacket);

  const conn = new Connection({
    ...fakeConn,
    async read(buf) {
      buf.set(new Uint8Array([1, 0]));
      return 2;
    },
  });

  conn.setServerProtocol(protocol, {});
  assert(await conn.receive() instanceof ServerPacket);

  conn.setClientProtocol(protocol, {});
  assert(await conn.receive() instanceof ClientPacket);

  assertEquals(timesServerHandlerCalled, 1);
  assertEquals(timesClientHandlerCalled, 1);
});

const fakeAddr: Deno.Addr = {
  transport: "tcp",
  hostname: "127.0.0.1",
  port: 12345,
};

const fakeConn: Deno.Conn = {
  rid: 0,
  localAddr: fakeAddr,
  remoteAddr: fakeAddr,
  read: async () => null,
  write: async () => 0,
  closeWrite: async () => {},
  close: async () => {},
  readable: new ReadableStream(),
  writable: new WritableStream(),
};

function fakeReaderConn(generator: Generator<Uint8Array>) {
  const conn = new Connection({
    ...fakeConn,
    async read(buf) {
      const result = generator.next();
      if (result.done) return null;
      buf.set(result.value);
      return Promise.resolve(result.value.length);
    },
  });

  return conn;
}
