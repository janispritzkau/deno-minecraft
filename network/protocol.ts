import {
  Packet,
  PacketConstructor,
  PacketReader,
  PacketWriter,
} from "./packet.ts";

export class UnregisteredPacket implements Packet<unknown> {
  constructor(public id: number, public buf: Uint8Array) {}
  write() {}
  handle() {}
}

export class PacketSet<PacketHandler> {
  private idToConstructor = new Map<number, PacketConstructor<PacketHandler>>();
  private constructorToId = new Map<PacketConstructor<PacketHandler>, number>();

  register(id: number, constructor: PacketConstructor<PacketHandler>) {
    this.idToConstructor.set(id, constructor);
    this.constructorToId.set(constructor, id);
  }

  serialize(packet: Packet<PacketHandler>): Uint8Array {
    const id = this.constructorToId.get(
      packet.constructor as unknown as PacketConstructor<PacketHandler>,
    );

    if (id == null) {
      throw new Error(
        `${packet.constructor.name ?? "Packet"} is not registered`,
      );
    }

    const writer = new PacketWriter().writeVarInt(id);
    packet.write(writer);
    return writer.bytes();
  }

  deserialize(
    buf: Uint8Array,
    ignoreUnregistered = false,
  ): Packet<PacketHandler> {
    const reader = new PacketReader(buf);
    const id = reader.readVarInt();
    const constructor = this.idToConstructor.get(id);

    if (!constructor) {
      if (ignoreUnregistered) return new UnregisteredPacket(id, buf);
      throw new Error(`No packet with id ${id} registered`);
    }

    const packet = constructor.read(reader);
    const unreadBytes = buf.length - reader.bytesRead();

    if (unreadBytes > 0) {
      throw new Error(
        `Packet larger than expected, ${unreadBytes} bytes extra found while reading ${constructor.name}`,
      );
    }

    return packet;
  }
}

export class Protocol<ServerPacketHandler, ClientPacketHandler> {
  private serverboundPackets = new PacketSet<ServerPacketHandler>();
  private clientboundPackets = new PacketSet<ClientPacketHandler>();

  registerServerbound(
    id: number,
    constructor: PacketConstructor<ServerPacketHandler>,
  ) {
    this.serverboundPackets.register(id, constructor);
  }

  registerClientbound(
    id: number,
    constructor: PacketConstructor<ClientPacketHandler>,
  ) {
    this.clientboundPackets.register(id, constructor);
  }

  serializeServerbound(packet: Packet<ServerPacketHandler>) {
    return this.serverboundPackets.serialize(packet);
  }

  serializeClientbound(packet: Packet<ClientPacketHandler>) {
    return this.clientboundPackets.serialize(packet);
  }

  deserializeServerbound(buf: Uint8Array, ignoreUnregistered = false) {
    return this.serverboundPackets.deserialize(buf, ignoreUnregistered);
  }

  deserializeClientbound(buf: Uint8Array, ignoreUnregistered = false) {
    return this.clientboundPackets.deserialize(buf, ignoreUnregistered);
  }
}
