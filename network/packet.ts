import { Reader, Writer } from "../io/mod.ts";
import { UnregisteredPacket } from "./protocol.ts";

/**
 * The interface that packets need to implement.
 *
 * In order for a packet to be used in a {@linkcode Protocol}, it must also
 * implement a static read method as defined in {@linkcode PacketConstructor}.
 */
export interface Packet<Handler extends PacketHandler | void = PacketHandler | void> {
  write(writer: Writer): void;
  handle(handler: Handler): Promise<void> | void;
}

export interface PacketConstructor<P extends Packet> {
  // deno-lint-ignore no-explicit-any
  new (...args: any[]): P;
  readonly name: string;
  read(reader: Reader): P;
}

/** The base interface for a connection packet handler. */
export interface PacketHandler {
  /** Gets called when the connection is closed. */
  onDisconnect?(): void;
  handleUnregistered?(packet: UnregisteredPacket): Promise<void>;
}
