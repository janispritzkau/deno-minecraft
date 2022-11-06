import * as zlib from "https://deno.land/x/compress@v0.4.5/zlib/mod.ts";
import { getVarIntSize, Reader, Writer } from "../io/mod.ts";
import { Packet, PacketHandler } from "./packet.ts";
import { Protocol } from "./protocol.ts";
import { Aes128Cfb8 } from "./_encryption.ts";

export const MAX_PACKET_LEN = 1024 * 2048 - 1;

/**
 * Represets the client or server end of a connection.
 *
 * It handles packet framing, compression, encryption, and serialization of
 * packets when a protocol is specified.
 *
 * To create a connection, use the `Deno.connect` and `Deno.listen` functions
 * to obtain a `Deno.Conn` and use the constructor to create a new {@linkcode Connection}.
 */
export class Connection {
  #conn: Deno.Conn;
  #closed = false;

  #isServer = false;
  #protocol: Protocol<unknown, unknown> | null = null;
  #handler: PacketHandler | null = null;
  #compressionThreshold = -1;
  #cipher: Aes128Cfb8 | null = null;
  #decipher: Aes128Cfb8 | null = null;

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
    this.#isServer = true;
    this.#protocol = protocol;
    if (handler) this.#handler = handler;
  }

  setClientProtocol<Handler extends PacketHandler | void>(
    protocol: Protocol<unknown, Handler>,
    handler?: Handler,
  ) {
    this.#isServer = false;
    this.#protocol = protocol;
    if (handler) this.#handler = handler;
  }

  /**
   * Sets the compression threshold value. Negative values disable compression.
   *
   * If the value is set to a non-negative number, the packet format is changed
   * and all packets larger than the threshold in bytes are compressed.
   */
  setCompressionThreshold(threshold: number) {
    this.#compressionThreshold = threshold;
  }

  /**
   * Enables encryption using the AES-128-CFB8 cipher and initializes it
   * with the specified key.
   */
  setEncryption(key: Uint8Array) {
    this.#cipher = new Aes128Cfb8(key, key);
    this.#decipher = new Aes128Cfb8(key, key);
  }

  /**
   * Sends a packet and serializes it using the previously specified protocol.
   *
   * If no protocol is set, this method will throw an exception.
   */
  async send(packet: Packet<unknown>): Promise<void> {
    if (!this.#protocol) throw new Error("No protocol was set");

    await this.sendRaw(
      this.#isServer
        ? this.#protocol.serializeClientbound(packet)
        : this.#protocol.serializeServerbound(packet),
    );
  }

  /**
   * Receives and deserializes a packet using the previously specified protocol.
   *
   * When a packet handler is specified with the protocol, the
   * {@linkcode Packet.handle} method will be called.
   *
   * If no protocol is set, this method will throw an exception.
   *
   * Once there are no more packets to read, e.g. because the connection has
   * been closed, this method returns a `null` value.
   */
  async receive(): Promise<Packet | null> {
    if (!this.#protocol) throw new Error("No protocol was set");

    const buf = await this.receiveRaw();
    if (!buf) return null;

    const packet = this.#isServer
      ? this.#protocol.deserializeServerbound(buf)
      : this.#protocol.deserializeClientbound(buf);

    if (this.#handler) await packet.handle(this.#handler);

    return packet;
  }

  async sendRaw(buf: Uint8Array): Promise<void> {
    if (this.#compressionThreshold >= 0) {
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

  async receiveRaw(): Promise<Uint8Array | null> {
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
        if (this.#decipher) {
          this.#decipher.decrypt(
            this.#buf.subarray(this.#len, this.#len + len),
          );
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

        if (this.#compressionThreshold >= 0) {
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

  /**
   * Closes the underlying `Deno.Conn` and calls {@linkcode PacketHandler.onDisconnect}
   * on the packet handler, if specified with the protocol.
   */
  close() {
    this.#conn.close();
    if (!this.#closed) this.#handler?.onDisconnect?.();
    this.#closed = true;
  }

  async #write(buf: Uint8Array) {
    if (this.#cipher) this.#cipher.encrypt(buf);
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
