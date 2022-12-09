import { Reader, Writer } from "../io/mod.ts";
import { Packet, PacketHandler } from "../network/packet.ts";
import { Protocol } from "../network/protocol.ts";

export interface ServerHandshakeHandler extends PacketHandler {
  handleIntention?(packet: ClientIntentionPacket): Promise<void>;
}

export class ClientIntentionPacket implements Packet<ServerHandshakeHandler> {
  constructor(
    public protocolVersion: number,
    public hostname: string,
    public port: number,
    /** The next protocol state. */
    public intention: number,
  ) {}

  static read(reader: Reader) {
    const protocolVersion = reader.readVarInt();
    const hostname = reader.readString(255);
    const port = reader.readShort();
    const intention = reader.readVarInt();
    return new this(protocolVersion, hostname, port, intention);
  }

  write(writer: Writer) {
    writer.writeVarInt(this.protocolVersion);
    writer.writeString(this.hostname);
    writer.writeShort(this.port);
    writer.writeVarInt(this.intention);
  }

  async handle(handler: ServerHandshakeHandler) {
    await handler.handleIntention?.(this);
  }
}

export const handshakeProtocol = new class HandshakeProtocol
  extends Protocol<ServerHandshakeHandler, void> {
  constructor() {
    super();
    this.registerServerbound(0x00, ClientIntentionPacket);
  }
}();

export interface ServerStatusHandler extends PacketHandler {
  handleStatusRequest?(packet: ServerboundStatusRequestPacket): Promise<void>;
  handlePingRequest?(packet: ServerboundPingRequestPacket): Promise<void>;
}

export class ServerboundStatusRequestPacket implements Packet<ServerStatusHandler> {
  static read() {
    return new this();
  }

  write() {}

  async handle(handler: ServerStatusHandler) {
    await handler.handleStatusRequest?.(this);
  }
}

export class ServerboundPingRequestPacket implements Packet<ServerStatusHandler> {
  constructor(public time: bigint) {}

  static read(reader: Reader) {
    return new this(reader.readLong());
  }

  write(writer: Writer) {
    writer.writeLong(this.time);
  }

  async handle(handler: ServerStatusHandler) {
    await handler.handlePingRequest?.(this);
  }
}

export interface ClientStatusHandler extends PacketHandler {
  handleStatusResponse?(packet: ClientboundStatusResponsePacket): Promise<void>;
  handlePongResponse?(packet: ClientboundPongResponsePacket): Promise<void>;
}

export class ClientboundStatusResponsePacket implements Packet<ClientStatusHandler> {
  constructor(public status: unknown) {}

  static read(reader: Reader) {
    return new this(JSON.parse(reader.readString()));
  }

  write(writer: Writer) {
    writer.writeString(JSON.stringify(this.status));
  }

  async handle(handler: ClientStatusHandler) {
    await handler.handleStatusResponse?.(this);
  }
}

export class ClientboundPongResponsePacket implements Packet<ClientStatusHandler> {
  constructor(public time: bigint) {}

  static read(reader: Reader) {
    return new this(reader.readLong());
  }

  write(writer: Writer) {
    writer.writeLong(this.time);
  }

  async handle(handler: ClientStatusHandler) {
    await handler.handlePongResponse?.(this);
  }
}

export const statusProtocol = new class StatusProtocol
  extends Protocol<ServerStatusHandler, ClientStatusHandler> {
  constructor() {
    super();
    this.registerServerbound(0x00, ServerboundStatusRequestPacket);
    this.registerServerbound(0x01, ServerboundPingRequestPacket);
    this.registerClientbound(0x00, ClientboundStatusResponsePacket);
    this.registerClientbound(0x01, ClientboundPongResponsePacket);
  }
}();
