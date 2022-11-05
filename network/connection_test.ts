import {
  assert,
  assertEquals,
  assertRejects,
  assertStrictEquals,
} from "https://deno.land/std@0.161.0/testing/asserts.ts";
import { Buffer } from "https://deno.land/std@0.161.0/io/buffer.ts";

import { Writer } from "../io/mod.ts";
import { Packet } from "./packet.ts";
import { Protocol } from "./protocol.ts";
import { Connection } from "./connection.ts";

Deno.test("read zero packet length", async () => {
  const conn = new Connection(mockConnBuffer(new Buffer([0])));
  await assertRejects(() => conn.receiveRaw());
});

Deno.test("read invalid packet length", async () => {
  const conn = new Connection(
    mockConnBuffer(new Buffer([255, 255, 255, 255, 255])),
  );
  await assertRejects(() => conn.receiveRaw());
});

Deno.test("read one packet with multiple read calls", async () => {
  const buf = new Uint8Array(256).map((_, i) => i % 256);

  const buffer = new Buffer();
  buffer.writeSync(new Writer().writeVarInt(256).bytes());
  buffer.writeSync(buf);

  const chunkLengths = [1, 1, 50, 206];
  let readCount = 0;

  const conn = new Connection(mockConn({
    read: (p) => buffer.read(p.subarray(0, chunkLengths[readCount++])),
  }));

  assertEquals(await conn.receiveRaw(), buf);
  assert(readCount == 4 && buffer.length == 0);
});

Deno.test("read multiple packets with one read call", async () => {
  const packets = [
    new Uint8Array([1]),
    new Uint8Array([255, 127, 0]),
    new Uint8Array(Array(256).keys()),
  ];

  const buffer = new Buffer();
  for (const p of packets) {
    buffer.writeSync(new Writer().writeVarInt(p.length).write(p).bytes());
  }

  let readCount = 0;
  const conn = new Connection(mockConn({
    read: (p) => (readCount++, buffer.read(p)),
  }));

  for (const p of packets) assertEquals(await conn.receiveRaw(), p);
  assertEquals(readCount, 1);
  assert(buffer.empty());
});

Deno.test("write packet", async () => {
  const buffer = new Buffer();
  const conn = new Connection(mockConnBuffer(buffer));

  await conn.sendRaw(new Uint8Array([0]));
  assertEquals(buffer.bytes(), new Uint8Array([1, 0]));
});

Deno.test("set protocol", async () => {
  let handlerInstance: unknown;
  let handlerCalls = 0;

  class TestPacket implements Packet<unknown> {
    static read() {
      return new this();
    }
    write() {}
    handle(handler: unknown) {
      handlerInstance = handler;
      handlerCalls += 1;
      return Promise.resolve();
    }
  }

  const protocol = new Protocol<unknown, unknown>();
  protocol.registerServerbound(0, TestPacket);
  protocol.registerClientbound(1, TestPacket);

  const buffer = new Buffer();
  const handler = {};

  const clientConn = new Connection(mockConnBuffer(buffer));
  clientConn.setClientProtocol(protocol);

  const serverConn = new Connection(mockConnBuffer(buffer));
  serverConn.setServerProtocol(protocol, handler);

  await serverConn.send(new TestPacket());
  assertEquals(buffer.bytes(), new Uint8Array([1, 1]));
  assertEquals(await clientConn.receive(), new TestPacket());
  assertEquals(handlerCalls, 0);

  await clientConn.send(new TestPacket());
  assertEquals(buffer.bytes(), new Uint8Array([1, 0]));
  assertEquals(await serverConn.receive(), new TestPacket());
  assertEquals(handlerCalls, 1);
  assertStrictEquals(handlerInstance, handler);

  buffer.writeSync(new Uint8Array([1, 2]));
  await assertRejects(() => clientConn.receive());
});

Deno.test("write packet under compression threshold", async () => {
  const buffer = new Buffer();
  const conn = new Connection(mockConnBuffer(buffer));

  conn.setCompressionThreshold(128);
  await conn.sendRaw(new Uint8Array([0]));

  assertEquals(buffer.bytes(), new Uint8Array([2, 0, 0]));
});

Deno.test("write packet over compression threshold", async () => {
  const buffer = new Buffer();
  const conn = new Connection(mockConnBuffer(buffer));

  conn.setCompressionThreshold(128);
  await conn.sendRaw(new Uint8Array(128));

  assertEquals(
    buffer.bytes(),
    new Uint8Array([14, 128, 1, 120, 156, 99, 96, 24, 88, 0, 0, 0, 128, 0, 1]),
  );
});

function mockConnBuffer(buffer: Buffer) {
  return mockConn({
    write: (p) => buffer.write(p),
    read: (p) => buffer.read(p),
  });
}

function mockConn(base: Partial<Deno.Conn> = {}): Deno.Conn {
  return {
    localAddr: { transport: "tcp", hostname: "", port: 0 },
    remoteAddr: { transport: "tcp", hostname: "", port: 0 },
    rid: -1,
    closeWrite: () => Promise.resolve(),
    read: () => Promise.resolve(null),
    write: () => Promise.resolve(0),
    close: () => {},
    readable: new ReadableStream(),
    writable: new WritableStream(),
    ...base,
  };
}
