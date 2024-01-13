import { Buffer } from "https://deno.land/std@0.210.0/io/buffer.ts";
import { assert, assertEquals, assertRejects, assertStrictEquals } from "https://deno.land/std@0.210.0/assert/mod.ts";
import { Writer } from "../io/mod.ts";
import { Connection } from "./connection.ts";
import { Packet } from "./packet.ts";
import { Protocol } from "./protocol.ts";

Deno.test("read zero packet length", async () => {
  const conn = new Connection(mockConnBuffer(new Buffer([0])));
  await assertRejects(() => conn.receiveRaw());
});

Deno.test("read invalid packet length", async () => {
  const buffer = new Buffer();
  const mockedConn = mockConnBuffer(buffer);

  buffer.writeSync(new Writer().writeVarInt(1 << 21).bytes());
  await assertRejects(() => new Connection(mockedConn).receiveRaw());

  buffer.writeSync(new Writer().writeVarInt((1 << 21) - 1).bytes());
  assertEquals(await new Connection(mockedConn).receiveRaw(), null);
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

Deno.test("write large packet", async () => {
  const packet = new Uint8Array(1 << 21);
  let bytesWritten = 0;

  const conn = new Connection(mockConn({
    write: (p) => {
      bytesWritten += p.length;
      return Promise.resolve(p.length);
    },
  }));

  await conn.sendRaw(packet.subarray(0, -1));
  assertEquals(bytesWritten, packet.length + 2);

  bytesWritten = 0;
  await assertRejects(() => conn.sendRaw(packet));
  assertEquals(bytesWritten, 0);
});

Deno.test("set protocol", async () => {
  let handlerInstance: unknown;
  let handlerCalls = 0;

  class TestPacket implements Packet {
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

  const protocol = new Protocol();
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

Deno.test("encryption", async () => {
  const buffer = new Buffer();
  const key = new Uint8Array(16).fill(7);
  const testData = new Uint8Array([127, 2, 0]);

  const clientConn = new Connection(mockConnBuffer(buffer));
  clientConn.setEncryption(key);
  await clientConn.sendRaw(testData.slice());
  assertEquals(buffer.bytes(), new Uint8Array([216, 149, 158, 37]));

  const serverConn = new Connection(mockConnBuffer(buffer));
  serverConn.setEncryption(key);
  assertEquals(await serverConn.receiveRaw(), testData);
});

function mockConnBuffer(buffer: Buffer, chunkLen = Infinity) {
  return mockConn({
    write: (p) => buffer.write(p.subarray(0, chunkLen)),
    read: (p) => buffer.read(p.subarray(0, chunkLen)),
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
  } as Deno.Conn;
}
