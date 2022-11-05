import { Reader, Writer } from "../io/mod.ts";

export interface Packet<Handler = void> {
  write(writer: Writer): void;
  handle(handler: Handler): Promise<void> | void;
}

export interface PacketConstructor<P extends Packet<unknown>> {
  // deno-lint-ignore no-explicit-any
  new (...args: any[]): P;
  readonly name: string;
  read(reader: Reader): P;
}

export interface PacketHandler {
  onDisconnect?(): void;
}
