import { Reader, Writer } from "../io/mod.ts";

/**
 * The base interface packets need to implement.
 *
 * In order for a packet to be used in a {@linkcode Protocol}, it must also
 * implement a static read method as defined in {@linkcode PacketConstructor}.
 *
 * ### Example packet definition
 *
 * ```ts
 * class ClientStatusResponsePacket implements Packet<ClientStatusHandler> {
 *   constructor(public status: unknown) {}
 *
 *   static read(reader: Reader) {
 *     return new this(reader.readJSON());
 *   }
 *
 *   write(writer: Writer) {
 *     writer.writeJSON(this.status);
 *   }
 *
 *   handle(handler: ClientStatusHandler) {
 *     return handler.handleResponse(this);
 *   }
 * }
 * ```
 */
export interface Packet<Handler = void> {
  write(writer: Writer): void;
  /**
   * Gets called on {@linkcode Connection.receive} when a protocol and
   * packet handler is set on the {@linkcode Connection} instance.
   *
   * The `handler` parameter is the packet handler specified via
   * {@linkcode Connection.setServerProtocol} or {@linkcode Connection.setClientProtocol}.
   */
  handle(handler: Handler): Promise<void> | void;
}

export interface PacketConstructor<P extends Packet<unknown>> {
  // deno-lint-ignore no-explicit-any
  new (...args: any[]): P;
  readonly name: string;
  read(reader: Reader): P;
}

/**
 * The base interface for a connection packet handler.
 *
 * A packet handler may look something like this:
 *
 * ```ts
 * interface ClientGameHandler extends PacketHandler {
 *   handleDisconnect?(packet: ClientDisconnectPacket): Promise<void>;
 *   handleKeepAlive?(packet: ClientKeepAlivePacket): Promise<void>;
 *   // ... methods for all the other packets
 * }
 * ```
 */
export interface PacketHandler {
  /** Gets called when the connection is closed. */
  onDisconnect?(): void;
}
