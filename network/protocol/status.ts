import { Packet, PacketHandler, Protocol } from "../mod.ts";
import { Reader, Writer } from "../../io/mod.ts";

export interface ServerStatusHandler extends PacketHandler {
  handleRequest(): Promise<void>;
  handlePing(ping: ServerStatusPingPacket): Promise<void>;
}

export interface ClientStatusHandler extends PacketHandler {
  handleResponse(): Promise<void>;
  handlePong(pong: ClientStatusPongPacket): Promise<void>;
}

const statusProtocol = new Protocol<
  ServerStatusHandler,
  ClientStatusHandler
>();

type ServerPacket = Packet<ServerStatusHandler>;
type ClientPacket = Packet<ClientStatusHandler>;

export class ServerStatusRequestPacket implements ServerPacket {
  static read() {
    return new this();
  }

  write() {}

  async handle(handler: ServerStatusHandler) {
    await handler.handleRequest();
  }
}

export class ServerStatusPingPacket implements ServerPacket {
  constructor(public id: bigint) {}

  static read(reader: Reader) {
    return new this(reader.readLong());
  }

  write(writer: Writer) {
    writer.writeLong(this.id);
  }

  async handle(handler: ServerStatusHandler) {
    await handler.handlePing(this);
  }
}

statusProtocol.registerServerbound(0x00, ServerStatusRequestPacket);
statusProtocol.registerServerbound(0x01, ServerStatusPingPacket);

export class ClientStatusResponsePacket implements ClientPacket {
  constructor(public status: unknown) {}

  static read(reader: Reader) {
    return new this(reader.readJSON());
  }

  write(writer: Writer) {
    writer.writeJSON(this.status);
  }

  async handle() {}
}

export class ClientStatusPongPacket implements ClientPacket {
  constructor(public id: bigint) {}

  static read(reader: Reader) {
    return new this(reader.readLong());
  }

  write(writer: Writer) {
    writer.writeLong(this.id);
  }

  async handle() {}
}

statusProtocol.registerClientbound(0x00, ClientStatusResponsePacket);
statusProtocol.registerClientbound(0x01, ClientStatusPongPacket);

export default statusProtocol;
