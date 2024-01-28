export interface RconConnectOptions extends Deno.ConnectOptions {
  port: number;
  password: string;
  host?: string;
}

export class RconClient {
  static async connect(options: RconConnectOptions): Promise<RconClient> {
    const conn = await Deno.connect(options);
    conn.setNoDelay(true);
    const client = new RconClient(conn);
    await client.auth(options.password);
    return client;
  }

  #writer: WritableStreamDefaultWriter<Uint8Array>;
  #reader: ReadableStreamBYOBReader;

  #lockPromise: Promise<void> = Promise.resolve();
  #authed = false;
  #reqId = 0;
  #closed = false;

  #buf = new Uint8Array(14 + 3 * 4096); // 14 byte header + worst case utf-8 length of 4096 utf-16 code units
  #skipRead = false;
  #pos = 0;

  constructor(conn: Deno.Conn) {
    this.#writer = conn.writable.getWriter();
    this.#reader = conn.readable.getReader({ mode: "byob" });
  }

  async auth(password: string) {
    if (this.#authed) throw new Error("Already authenticated");
    const release = await this.#lock();
    try {
      const reqId = this.#nextReqId();
      await this.#send(reqId, 3, password);

      const res = await this.#recv();
      if (!res) throw new Error("Connection closed");

      if (res.id == -1) throw new Error("Authentication failed");
      if (res.id != reqId) throw new Error(`Invalid response id (expected ${reqId}, got ${res.id})`);
      if (res.type != 2) throw new Error(`Unexpected response type (expected 2, got ${res.type})`);

      this.#authed = true;
    } catch (e) {
      await this.close();
      throw e;
    } finally {
      release();
    }
  }

  async cmd(cmd: string): Promise<string | null> {
    if (!this.#authed) throw new Error("Not authenticated");
    const release = await this.#lock();
    try {
      const reqId = this.#nextReqId();
      await this.#send(reqId, 2, cmd);

      // By reading immediately after each write, we avoid packets being combined by the TCP stack,
      // thus avoiding an implementation bug in the Minecraft server
      const res = await this.#recv();
      if (!res) return null;

      if (res.id != reqId) throw new Error(`Invalid response id (expected ${reqId}, got ${res.id})`);
      if (res.type != 0) throw new Error(`Unexpected response type (expected 0, got ${res.type})`);

      if (res.message.length < 4096) {
        // message is guaranteed to be not fragmented
        // note: minecraft java counts the length as utf-16 code units (like we do here)
        this.#reqId += 1;
        return res.message;
      }

      const dummyReqId = this.#nextReqId();
      // send dummy request which is guaranteed to be not fragmented
      await this.#send(dummyReqId, -1, "");

      let output = res.message;
      while (true) {
        const res = await this.#recv();
        if (!res) return null;

        // message is complete when dummy response is received
        if (res.id == dummyReqId) break;

        if (res.id != reqId) throw new Error(`Invalid response id (expected ${reqId}, got ${res.id})`);
        if (res.type != 0) throw new Error(`Unexpected response type (expected 0, got ${res.type})`);

        output += res.message;
      }
      return output;
    } catch (e) {
      if (!this.#closed) await this.close();
      throw e;
    } finally {
      release();
    }
  }

  async close() {
    this.#closed = true;
    await this.#writer.close();
  }

  async #send(id: number, type: number, message: string) {
    if (this.#closed) throw new Error("Connection closed");
    const payload = new TextEncoder().encode(message);
    const buf = new Uint8Array(14 + payload.length);
    const view = new DataView(buf.buffer);
    view.setUint32(0, 10 + payload.length, true);
    view.setInt32(4, id, true);
    view.setInt32(8, type, true);
    buf.set(payload, 12);
    // this may still result in a fragmented tcp packet if used over external network interfaces,
    // therefore using RCON over anything other than localhost is not recommended
    if (buf.length > 1460) throw new Error("Message too long");
    await this.#writer.write(buf);
  }

  async #recv(): Promise<{ id: number; type: number; message: string } | null> {
    while (!this.#closed) {
      if (!this.#skipRead) {
        const result = await this.#reader.read(this.#buf.subarray(this.#pos));
        if (result.done) {
          this.#closed = true;
          return null;
        }
        this.#buf = new Uint8Array(result.value.buffer);
        this.#pos += result.value.length;
      }

      this.#skipRead = false;

      if (this.#pos < 4) continue;
      const view = new DataView(this.#buf.buffer, this.#buf.byteOffset, this.#pos);
      const len = view.getUint32(0, true);

      if (this.#pos < 4 + len) continue;
      const id = view.getInt32(4, true);
      const type = view.getInt32(8, true);
      const payload = this.#buf.subarray(12, len + 2);
      const message = new TextDecoder().decode(payload);

      this.#buf.copyWithin(0, len + 4);
      this.#pos -= len + 4;
      this.#skipRead = true;

      return { id, type, message };
    }
    return null;
  }

  #lock(): Promise<() => void> {
    return new Promise((resolve) => {
      this.#lockPromise = this.#lockPromise.then(() => {
        return new Promise((release) => resolve(release));
      });
    });
  }

  #nextReqId() {
    const id = this.#reqId;
    this.#reqId = (this.#reqId + 1) % 0x8000_0000;
    return id;
  }
}
