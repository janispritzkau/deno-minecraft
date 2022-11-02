import {
  assertEquals,
  assertInstanceOf,
  assertThrows,
} from "https://deno.land/std@0.161.0/testing/asserts.ts";

import { Packet } from "./packet.ts";
import { Protocol, UnregisteredPacket } from "./protocol.ts";
import { Reader, Writer } from "../io/mod.ts";

interface ServerPacketHandler {
  handlePacket(packet: ServerPacket): void;
}

class ServerPacket implements Packet<ServerPacketHandler> {
  static read(reader: Reader) {
    return new this(reader.readString());
  }

  constructor(public name: string) {}

  write(writer: Writer) {
    writer.writeString(this.name);
  }

  handle(handler: ServerPacketHandler) {
    handler.handlePacket(this);
  }
}

class ClientPacket implements Packet<void> {
  static read() {
    return new this();
  }
  write() {}
  handle() {}
}

Deno.test("protocol", () => {
  const protocol = new Protocol<ServerPacketHandler, void>();

  protocol.registerServerbound(0, ServerPacket);
  protocol.registerClientbound(1, ClientPacket);

  const buf = new Writer().writeVarInt(0).writeString("hello").bytes();
  const serverPacket = protocol.deserializeServerbound(buf);

  assertEquals(protocol.serializeServerbound(serverPacket), buf);

  serverPacket.handle({
    handlePacket(packet) {
      assertEquals(packet, new ServerPacket("hello"));
    },
  });

  assertEquals(
    protocol.serializeClientbound(new ClientPacket()),
    new Uint8Array([1]),
  );
});

Deno.test("unregistered packet", () => {
  assertThrows(() =>
    new Protocol().deserializeClientbound(new Uint8Array([0]))
  );
  assertInstanceOf(
    new Protocol({ ignoreUnregistered: true })
      .deserializeClientbound(new Uint8Array([0])),
    UnregisteredPacket,
  );
});

Deno.test("packet with extra bytes", () => {
  const protocol = new Protocol();
  protocol.registerClientbound(0, ClientPacket);

  assertThrows(() => protocol.deserializeClientbound(new Uint8Array([0, 0])));
});
