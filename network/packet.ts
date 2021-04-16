import { CompoundTag } from "../nbt/tag.ts";
import { NBTReader } from "../nbt/reader.ts";
import { NBTWriter } from "../nbt/writer.ts";

export interface Packet<PacketHandler> {
  write(writer: PacketWriter): void;
  handle(handler: PacketHandler): Promise<void> | void;
}

export interface PacketConstructor<PacketHandler> {
  name: string;
  read(reader: PacketReader): Packet<PacketHandler>;
}

const textDecoder = new TextDecoder();

export class PacketReader {
  private buf: Uint8Array;
  private view: DataView;
  private pos = 0;

  constructor(buf: Uint8Array) {
    this.buf = buf;
    this.view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  }

  bytesRead() {
    return this.pos;
  }

  readByte() {
    const x = this.view.getInt8(this.pos);
    this.pos += 1;
    return x;
  }

  readUnsignedByte() {
    const x = this.view.getUint8(this.pos);
    this.pos += 1;
    return x;
  }

  readShort() {
    const x = this.view.getInt16(this.pos);
    this.pos += 2;
    return x;
  }

  readUnsignedShort() {
    const x = this.view.getUint16(this.pos);
    this.pos += 2;
    return x;
  }

  readInt() {
    const x = this.view.getInt32(this.pos);
    this.pos += 4;
    return x;
  }

  readUnsignedInt() {
    const x = this.view.getUint32(this.pos);
    this.pos += 4;
    return x;
  }

  readLong() {
    const x = this.view.getBigInt64(this.pos);
    this.pos += 8;
    return x;
  }

  readUnsignedLong() {
    const x = this.view.getBigUint64(this.pos);
    this.pos += 8;
    return x;
  }

  readFloat() {
    const value = this.view.getFloat32(this.pos);
    this.pos += 4;
    return value;
  }

  readDouble() {
    const value = this.view.getFloat64(this.pos);
    this.pos += 8;
    return value;
  }

  readBoolean() {
    return Boolean(this.readByte());
  }

  readVarInt() {
    let x = 0, n = 0, b: number;
    do {
      b = this.readByte();
      x |= (b & 0x7f) << (7 * n);
      if (++n > 5) throw new Error("VarInt is too big");
    } while ((b & 0x80) != 0);
    return x;
  }

  readVarLong() {
    let x = 0n, n = 0n, b: number;
    do {
      b = this.readByte();
      x |= BigInt(b & 0x7f) << (7n * n);
      if (++n > 10n) throw new Error("VarLong is too big");
    } while ((b & 0x80) != 0);
    return BigInt.asIntN(64, x);
  }

  read(n: number) {
    if (this.pos + n > this.buf.byteLength) throw new Error("Not enough data");
    return this.buf.subarray(this.pos, this.pos += n);
  }

  readString(maxLen?: number) {
    const len = this.readVarInt();
    if (maxLen && len > maxLen) throw new Error("String is too long");
    return textDecoder.decode(this.read(len));
  }

  readJSON(maxLen?: number) {
    return JSON.parse(this.readString(maxLen));
  }

  readNBT() {
    const reader = new NBTReader(this.buf.subarray(this.pos));
    const tag = reader.readCompoundTag();
    this.pos += reader.bytesRead();
    return tag;
  }
}

const textEncoder = new TextEncoder();

export class PacketWriter {
  private buf: Uint8Array;
  private view: DataView;
  private pos: number;

  constructor(buf = new Uint8Array(16), pos = 0) {
    this.buf = buf;
    this.view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    this.pos = pos;
  }

  getBuf() {
    return this.buf;
  }

  getPos() {
    return this.pos;
  }

  bytes() {
    return this.buf.subarray(0, this.pos);
  }

  writeByte(x: number) {
    this.grow(1);
    this.view.setInt8(this.pos, x);
    return (this.pos += 1, this);
  }

  writeUnsignedByte(x: number) {
    this.grow(1);
    this.view.setUint8(this.pos, x);
    return (this.pos += 1, this);
  }

  writeShort(x: number) {
    this.grow(2);
    this.view.setInt16(this.pos, x);
    return (this.pos += 2, this);
  }

  writeUnsignedShort(x: number) {
    this.grow(2);
    this.view.setUint16(this.pos, x);
    return (this.pos += 2, this);
  }

  writeInt(x: number) {
    this.grow(4);
    this.view.setInt32(this.pos, x);
    return (this.pos += 4, this);
  }

  writeUnsignedInt(x: number) {
    this.grow(4);
    this.view.setUint32(this.pos, x);
    return (this.pos += 4, this);
  }

  writeLong(x: bigint) {
    this.grow(8);
    this.view.setBigInt64(this.pos, x);
    return (this.pos += 8, this);
  }

  writeUnsignedLong(x: bigint) {
    this.grow(8);
    this.view.setBigUint64(this.pos, x);
    return (this.pos += 8, this);
  }

  writeFloat(x: number) {
    this.grow(4);
    this.view.setFloat32(this.pos, x);
    return (this.pos += 4, this);
  }

  writeDouble(x: number) {
    this.grow(8);
    this.view.setFloat64(this.pos, x);
    return (this.pos += 8, this);
  }

  writeBoolean(x: boolean) {
    return this.writeByte(Number(x));
  }

  writeVarInt(x: number) {
    do {
      let b = x & 0x7f;
      x >>>= 7;
      if (x != 0) b |= 0x80;
      this.writeByte(b);
    } while (x != 0);
    return this;
  }

  writeVarLong(x: bigint) {
    x = BigInt.asUintN(64, x);
    do {
      let b = x & 0x7fn;
      x = BigInt.asUintN(64, x >> 7n);
      if (x != 0n) b |= 0x80n;
      this.writeByte(Number(b));
    } while (x != 0n);
    return this;
  }

  write(buf: Uint8Array) {
    this.grow(buf.byteLength);
    this.buf.set(buf, this.pos);
    this.pos += buf.byteLength;
    return this;
  }

  writeString(x: string) {
    const buf = textEncoder.encode(x);
    this.writeVarInt(buf.byteLength);
    this.write(buf);
    return this;
  }

  writeJSON(x: unknown) {
    return this.writeString(JSON.stringify(x));
  }

  writeNBT(tag: CompoundTag | null) {
    const writer = new NBTWriter(this.buf, this.pos);
    writer.writeCompoundTag(tag);
    const buf = writer.getBuf();
    this.buf = buf;
    this.view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    this.pos = writer.getPos();
    return this;
  }

  private grow(n: number) {
    const capacity = this.buf.byteLength;
    if (this.pos + n <= capacity) return;

    const buf = this.buf;
    this.buf = new Uint8Array(capacity * 2 + n);
    this.buf.set(buf);
    this.view = new DataView(this.buf.buffer);
  }
}
