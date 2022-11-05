import { Packet, PacketHandler, Protocol } from "../mod.ts";
import { Reader, Writer } from "../../io/mod.ts";

export interface ServerHandshakeHandler extends PacketHandler {
  handleHandshake(packet: ServerHandshakePacket): Promise<void> | void;
}

export class ServerHandshakePacket implements Packet<ServerHandshakeHandler> {
  constructor(
    public protocol: number,
    public hostname: string,
    public port: number,
    public nextState: number,
  ) {}

  static read(reader: Reader) {
    return new this(
      reader.readVarInt(),
      reader.readString(),
      reader.readUnsignedShort(),
      reader.readVarInt(),
    );
  }

  write(writer: Writer) {
    writer
      .writeVarInt(this.protocol)
      .writeString(this.hostname)
      .writeUnsignedShort(this.port)
      .writeVarInt(this.nextState);
  }

  async handle(handler: ServerHandshakeHandler) {
    await handler.handleHandshake(this);
  }
}

const handshakeProtocol = new Protocol<ServerHandshakeHandler, void>();
handshakeProtocol.registerServerbound(0x00, ServerHandshakePacket);

export default handshakeProtocol;
