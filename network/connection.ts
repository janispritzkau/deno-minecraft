import * as zlib from "https://deno.land/x/compress@v0.4.5/zlib/mod.ts";
import { getVarIntSize, Reader, Writer } from "../io/mod.ts";
import { Packet, PacketHandler } from "./packet.ts";
import { Protocol } from "./protocol.ts";

export const MAX_PACKET_LEN = 1024 * 2048 - 1;

export class Connection {
  #conn: Deno.Conn;
  #closed = false;

  #serverbound = false;
  #protocol: Protocol<unknown, unknown> | null = null;
  #handler: PacketHandler | null = null;
  #compressionThreshold: number | null = null;

  #buf = new Uint8Array(512);
  #len = 0;
  #pos = 0;
  #skipRead = false;

  constructor(conn: Deno.Conn) {
    this.#conn = conn;
  }

  setServerProtocol<Handler extends PacketHandler | void>(
    protocol: Protocol<Handler, unknown>,
    handler?: Handler,
  ) {
    this.#serverbound = true;
    this.#protocol = protocol;
    if (handler) this.#handler = handler;
  }

  setClientProtocol<Handler extends PacketHandler | void>(
    protocol: Protocol<unknown, Handler>,
    handler?: Handler,
  ) {
    this.#serverbound = false;
    this.#protocol = protocol;
    if (handler) this.#handler = handler;
  }

  setCompressionThreshold(threshold: number) {
    if (threshold >= 0) this.#compressionThreshold = threshold;
  }

  async send(packet: Packet<unknown>) {
    if (!this.#protocol) throw new Error("No protocol was set");

    await this.sendRaw(
      this.#serverbound
        ? this.#protocol.serializeClientbound(packet)
        : this.#protocol.serializeServerbound(packet),
    );
  }

  async receive() {
    if (!this.#protocol) throw new Error("No protocol was set");

    const buf = await this.receiveRaw();
    if (!buf) return null;

    const packet = this.#serverbound
      ? this.#protocol.deserializeServerbound(buf)
      : this.#protocol.deserializeClientbound(buf);

    if (this.#handler) await packet.handle(this.#handler);

    return packet;
  }

  async sendRaw(buf: Uint8Array) {
    if (this.#compressionThreshold) {
      if (buf.byteLength < this.#compressionThreshold) {
        await this.#write(
          new Writer().writeVarInt(buf.byteLength + 1).writeVarInt(0).bytes(),
        );
        await this.#write(buf);
      } else {
        const compressedBuf = zlib.deflate(buf);
        await this.#write(
          new Writer().writeVarInt(
            compressedBuf.byteLength + getVarIntSize(buf.byteLength),
          ).writeVarInt(buf.byteLength).bytes(),
        );
        await this.#write(compressedBuf);
      }
    } else {
      await this.#write(new Writer().writeVarInt(buf.byteLength).bytes());
      await this.#write(buf);
    }
  }

  async receiveRaw() {
    if (this.#closed) return null;

    if (this.#pos > 0) {
      // copy unread bytes to the front
      this.#buf.copyWithin(0, this.#pos, this.#len);
      this.#len -= this.#pos;
      this.#pos = 0;
    }

    while (true) {
      if (!this.#skipRead) {
        this.#growBuffer();
        const len = await this.#conn.read(this.#buf.subarray(this.#len));
        if (len == null) {
          this.close();
          return null;
        }
        this.#len += len;
      }

      this.#skipRead = false;
      const reader = new Reader(this.#buf.subarray(0, this.#len));

      let packetLen: number;
      try {
        packetLen = reader.readVarInt();
      } catch (e) {
        if (this.#len >= 5) throw e;
        continue; // more bytes needed
      }

      if (packetLen == 0) {
        throw new Error("Packet length can't be zero");
      }

      if (packetLen > MAX_PACKET_LEN) {
        throw new Error("Packet too large");
      }

      const packetEnd = reader.bytesRead() + packetLen;

      if (packetEnd <= this.#len) {
        if (this.#len > packetEnd) this.#skipRead = true;
        this.#pos = packetEnd;

        if (this.#compressionThreshold != null) {
          const uncompressedSize = reader.readVarInt();
          let packetBuf = this.#buf.subarray(reader.bytesRead(), packetEnd);
          if (uncompressedSize != 0) packetBuf = zlib.inflate(packetBuf);
          return packetBuf;
        } else {
          return this.#buf.subarray(reader.bytesRead(), packetEnd);
        }
      }
    }
  }

  close() {
    if (!this.#closed) this.#handler?.onDisconnect?.();
    this.#conn.close();
    this.#closed = true;
  }

  async #write(buf: Uint8Array) {
    while (buf.length > 0) {
      buf = buf.subarray(await this.#conn.write(buf));
    }
  }

  #growBuffer() {
    if (this.#len < this.#buf.byteLength) return;
    const readBytes = this.#buf.subarray(0, this.#len);
    this.#buf = new Uint8Array(this.#buf.byteLength * 2);
    this.#buf.set(readBytes);
  }
}
