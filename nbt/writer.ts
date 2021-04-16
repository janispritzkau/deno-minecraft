import { CompoundTag, Tag } from "./tag.ts";

const textEncoder = new TextEncoder();

export class NBTWriter {
  private buf: Uint8Array;
  private view: DataView;
  private pos = 0;

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

  writeByte(value: number) {
    this.grow(1);
    this.view.setInt8(this.pos, value);
    this.pos += 1;
  }

  writeShort(value: number) {
    this.grow(2);
    this.view.setInt16(this.pos, value);
    this.pos += 2;
  }

  writeInt(value: number) {
    this.grow(4);
    this.view.setInt32(this.pos, value);
    this.pos += 4;
  }

  writeLong(value: bigint) {
    this.grow(8);
    this.view.setBigInt64(this.pos, value);
    this.pos += 8;
  }

  writeFloat(value: number) {
    this.grow(4);
    this.view.setFloat32(this.pos, value);
    this.pos += 4;
  }

  writeDouble(value: number) {
    this.grow(8);
    this.view.setFloat64(this.pos, value);
    this.pos += 8;
  }

  writeByteArray(value: Uint8Array) {
    this.writeInt(value.length);
    this.grow(value.length);
    this.buf.set(value, this.pos);
    this.pos += value.length;
  }

  writeString(value: string) {
    const buf = textEncoder.encode(value);
    this.writeShort(buf.length);
    this.grow(buf.byteLength);
    this.buf.set(buf, this.pos);
    this.pos += buf.byteLength;
  }

  writeList(value: Tag[]) {
    const type = value.length == 0 ? 0 : value[0].getId();
    this.writeByte(type);
    this.writeInt(value.length);
    for (const tag of value) {
      if (tag.getId() != type) {
        throw new Error("All tags in a list must be of the same type");
      }
      this.writeTag(tag);
    }
  }

  writeCompound(value: Map<string, Tag>) {
    for (const [key, tag] of value) {
      this.writeByte(tag.getId());
      this.writeString(key);
      this.writeTag(tag);
    }
    this.writeByte(0);
  }

  writeIntArray(value: Int32Array) {
    this.writeInt(value.length);
    this.grow(value.length * 4);
    for (let i = 0; i < value.length; i++) {
      this.view.setInt32(this.pos, value[i]);
      this.pos += 4;
    }
  }

  writeLongArray(value: BigInt64Array) {
    this.writeInt(value.length);
    this.grow(value.length * 8);
    for (let i = 0; i < value.length; i++) {
      this.view.setBigInt64(this.pos, value[i]);
      this.pos += 8;
    }
  }

  writeTag(tag: Tag) {
    tag.write(this);
    return this;
  }

  writeCompoundTag(tag: CompoundTag | null) {
    if (tag == null) {
      this.writeByte(0);
    } else {
      this.writeByte(tag.getId());
      this.writeString("");
      this.writeTag(tag);
    }
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
