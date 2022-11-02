import { Packet, PacketConstructor } from "./packet.ts";
import { Reader, Writer } from "../io/mod.ts";

export interface ProtocolOptions {
  ignoreUnregistered?: boolean;
}

export class Protocol<ServerPacketHandler, ClientPacketHandler> {
  #serverboundPackets = new PacketSet<ServerPacketHandler>();
  #clientboundPackets = new PacketSet<ClientPacketHandler>();
  #ignoreUnregistered: boolean;

  constructor(options?: ProtocolOptions) {
    this.#ignoreUnregistered ??= options?.ignoreUnregistered ?? false;
  }

  registerServerbound(
    id: number,
    constructor: PacketConstructor<ServerPacketHandler>,
  ) {
    this.#serverboundPackets.register(id, constructor);
  }

  registerClientbound(
    id: number,
    constructor: PacketConstructor<ClientPacketHandler>,
  ) {
    this.#clientboundPackets.register(id, constructor);
  }

  serializeServerbound(packet: Packet<ServerPacketHandler>) {
    return this.#serverboundPackets.serialize(packet);
  }

  serializeClientbound(packet: Packet<ClientPacketHandler>) {
    return this.#clientboundPackets.serialize(packet);
  }

  deserializeServerbound(buf: Uint8Array) {
    return this.#serverboundPackets.deserialize(buf, this.#ignoreUnregistered);
  }

  deserializeClientbound(buf: Uint8Array) {
    return this.#clientboundPackets.deserialize(buf, this.#ignoreUnregistered);
  }
}

export class UnregisteredPacket implements Packet {
  constructor(public id: number, public buf: Uint8Array) {}
  async write() {}
  async handle() {}
}

class PacketSet<PacketHandler> {
  idToConstructor = new Map<number, PacketConstructor<PacketHandler>>();
  constructorToId = new Map<PacketConstructor<PacketHandler>, number>();

  register(id: number, constructor: PacketConstructor<PacketHandler>) {
    this.idToConstructor.set(id, constructor);
    this.constructorToId.set(constructor, id);
  }

  serialize(packet: Packet<PacketHandler>): Uint8Array {
    const id = this.constructorToId.get(
      packet.constructor as PacketConstructor<PacketHandler>,
    );

    if (id == null) {
      throw new Error(`${packet.constructor.name} is not registered`);
    }

    const writer = new Writer().writeVarInt(id);
    packet.write(writer);
    return writer.bytes();
  }

  deserialize(
    buf: Uint8Array,
    ignoreUnregistered = false,
  ): Packet<PacketHandler> {
    const reader = new Reader(buf);
    const id = reader.readVarInt();
    const constructor = this.idToConstructor.get(id);

    if (!constructor) {
      if (ignoreUnregistered) return new UnregisteredPacket(id, buf);
      throw new Error(`No packet registered with id ${id}`);
    }

    const packet = constructor.read(reader);
    const unreadBytes = buf.byteLength - reader.bytesRead();

    if (unreadBytes > 0) {
      throw new Error(
        `Packet larger than expected, ${unreadBytes} bytes extra found while reading ${constructor.name}`,
      );
    }

    return packet;
  }
}
