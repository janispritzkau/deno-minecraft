import { Reader, Writer } from "../io/mod.ts";

export interface Packet<PacketHandler = unknown> {
  write(writer: Writer): void;
  handle(handler: PacketHandler): Promise<void> | void;
}

export interface PacketConstructor<PacketHandler, P = Packet<PacketHandler>> {
  // deno-lint-ignore no-explicit-any
  new (...args: any[]): P;
  readonly name: string;
  read(reader: Reader): P;
}

export interface PacketHandler {
  onDisconnect?(): void;
}
