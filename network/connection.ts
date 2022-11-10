import * as zlib from "https://deno.land/x/compress@v0.4.5/zlib/mod.ts";
import { Reader, Writer } from "../io/mod.ts";
import { Packet, PacketHandler } from "./packet.ts";
import { Protocol } from "./protocol.ts";
import { Aes128Cfb8 } from "./_encryption.ts";

const MAX_PACKET_LEN = (1 << 21) - 1;

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
  #writePos = 0;
  #readPos = 0;

  constructor(conn: Deno.Conn) {
    this.#conn = conn;
  }

  get closed() {
    return this.#closed;
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
    let len = 0;
    const chunks: Uint8Array[] = [];
    if (this.#compressionThreshold >= 0) {
      if (buf.byteLength < this.#compressionThreshold) {
        len = buf.byteLength + 1;
        chunks.push(new Writer().writeVarInt(0).bytes(), buf);
      } else {
        const compressedBuf = zlib.deflate(buf);
        const lenBuf = new Writer().writeVarInt(buf.byteLength).bytes();
        len = lenBuf.byteLength + compressedBuf.byteLength;
        chunks.push(lenBuf, compressedBuf);
      }
    } else {
      len = buf.byteLength;
      chunks.push(buf);
    }
    if (len > MAX_PACKET_LEN) throw new Error("Packet is too large");
    await this.#write(new Writer().writeVarInt(len).bytes());
    for (const chunk of chunks) await this.#write(chunk);
  }

  async receiveRaw(): Promise<Uint8Array | null> {
    if (this.#closed) return null;

    if (this.#readPos > 0) {
      // copy unread bytes to the front
      this.#buf.copyWithin(0, this.#readPos, this.#writePos);
      this.#writePos -= this.#readPos;
      this.#readPos = 0;
    }

    let skipRead = this.#readPos < this.#writePos;
    while (true) {
      if (!skipRead) {
        if (this.#writePos == this.#buf.byteLength) {
          const buf = this.#buf.subarray(0, this.#writePos);
          this.#buf = new Uint8Array(this.#buf.byteLength * 2);
          this.#buf.set(buf);
        }

        const len = await this.#conn.read(this.#buf.subarray(this.#writePos));
        if (len == null) {
          this.close();
          return null;
        }

        if (this.#decipher) {
          this.#decipher.decrypt(
            this.#buf.subarray(this.#writePos, this.#writePos + len),
          );
        }

        this.#writePos += len;
      }

      skipRead = false;
      const reader = new Reader(this.#buf.subarray(0, this.#writePos));

      let packetLen: number;
      try {
        packetLen = reader.readVarInt();
      } catch (e) {
        if (reader.bytesRead >= 3) throw e;
        continue;
      }

      if (packetLen == 0) {
        throw new Error("Packet length can't be zero");
      }

      if (packetLen > MAX_PACKET_LEN) {
        throw new Error("Packet is too large");
      }

      const packetEnd = reader.bytesRead + packetLen;

      if (packetEnd <= this.#writePos) {
        this.#readPos = packetEnd;

        if (this.#compressionThreshold < 0) {
          return this.#buf.subarray(reader.bytesRead, packetEnd);
        }

        const uncompressedSize = reader.readVarInt();
        const packetBuf = this.#buf.subarray(reader.bytesRead, packetEnd);

        if (uncompressedSize == 0) return packetBuf;
        if (uncompressedSize < this.#compressionThreshold) {
          throw new Error("Packet length is below compression threshold");
        } else return zlib.inflate(packetBuf);
      }
    }
  }

  /**
   * Closes the underlying `Deno.Conn` and calls {@linkcode PacketHandler.onDisconnect}
   * on the packet handler, if specified with the protocol.
   */
  close() {
    this.#conn.close();
    this.#handler?.onDisconnect?.();
    this.#closed = true;
  }

  async #write(buf: Uint8Array) {
    if (this.#cipher) this.#cipher.encrypt(buf);
    while (buf.length > 0) {
      buf = buf.subarray(await this.#conn.write(buf));
    }
  }
}
