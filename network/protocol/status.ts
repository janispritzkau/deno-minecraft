import { Packet, PacketHandler, Protocol } from "../mod.ts";
import { Reader, Writer } from "../../io/mod.ts";

type MaybePromise<T> = Promise<T> | void;

export interface ServerStatusHandler extends PacketHandler {
  handleRequest?(): MaybePromise<void>;
  handlePing?(packet: ServerStatusPingPacket): MaybePromise<void>;
}

export interface ClientStatusHandler extends PacketHandler {
  handleResponse?(packet: ClientStatusResponsePacket): MaybePromise<void>;
  handlePong?(packet: ClientStatusPongPacket): MaybePromise<void>;
}

type ServerPacket = Packet<ServerStatusHandler>;
type ClientPacket = Packet<ClientStatusHandler>;

export class ServerStatusRequestPacket implements ServerPacket {
  static read() {
    return new this();
  }

  write() {}

  handle(handler: ServerStatusHandler) {
    return handler.handleRequest?.();
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

  handle(handler: ServerStatusHandler) {
    return handler.handlePing?.(this);
  }
}

export class ClientStatusResponsePacket implements ClientPacket {
  constructor(public status: unknown) {}

  static read(reader: Reader) {
    return new this(reader.readJson());
  }

  write(writer: Writer) {
    writer.writeJson(this.status);
  }

  handle(handler: ClientStatusHandler) {
    return handler.handleResponse?.(this);
  }
}

export class ClientStatusPongPacket implements ClientPacket {
  constructor(public id: bigint) {}

  static read(reader: Reader) {
    return new this(reader.readLong());
  }

  write(writer: Writer) {
    writer.writeLong(this.id);
  }

  handle(handler: ClientStatusHandler) {
    return handler.handlePong?.(this);
  }
}

const statusProtocol = new Protocol<ServerStatusHandler, ClientStatusHandler>();

statusProtocol.registerServerbound(0x00, ServerStatusRequestPacket);
statusProtocol.registerServerbound(0x01, ServerStatusPingPacket);

statusProtocol.registerClientbound(0x00, ClientStatusResponsePacket);
statusProtocol.registerClientbound(0x01, ClientStatusPongPacket);

export default statusProtocol;
