import * as tag from "./tag.ts";

const textDecoder = new TextDecoder();

export class NBTReader {
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
    const value = this.view.getInt8(this.pos);
    this.pos += 1;
    return value;
  }

  readShort() {
    const value = this.view.getInt16(this.pos);
    this.pos += 2;
    return value;
  }

  readInt() {
    const x = this.view.getInt32(this.pos);
    this.pos += 4;
    return x;
  }

  readLong() {
    const x = this.view.getBigInt64(this.pos);
    this.pos += 8;
    return x;
  }

  readFloat() {
    const x = this.view.getFloat32(this.pos);
    this.pos += 4;
    return x;
  }

  readDouble() {
    const x = this.view.getFloat64(this.pos);
    this.pos += 8;
    return x;
  }

  readByteArray() {
    const len = this.readInt();
    return this.buf.subarray(this.pos, this.pos += len);
  }

  readString() {
    const len = this.readShort();
    return textDecoder.decode(this.buf.subarray(this.pos, this.pos += len));
  }

  readList() {
    const id = this.readByte();
    const len = this.readInt();
    const value: tag.Tag[] = [];
    for (let i = 0; i < len; i++) {
      value.push(this.readTag(id));
    }
    return value;
  }

  readCompound() {
    const value = new Map<string, tag.Tag>();
    while (true) {
      const type = this.readByte();
      if (type == 0) break;
      const key = this.readString();
      value.set(key, this.readTag(type));
    }
    return value;
  }

  readIntArray() {
    const len = this.readInt();
    const value = new Int32Array(len);
    for (let i = 0; i < len; i++) {
      value[i] = this.readInt();
    }
    return value;
  }

  readLongArray() {
    const len = this.readInt();
    const value = new BigInt64Array(len);
    for (let i = 0; i < len; i++) {
      value[i] = this.readLong();
    }
    return value;
  }

  readTag(id: number): tag.Tag {
    if (id == 1) {
      return new tag.ByteTag(this.readByte());
    } else if (id == 2) {
      return new tag.ShortTag(this.readShort());
    } else if (id == 3) {
      return new tag.IntTag(this.readInt());
    } else if (id == 4) {
      return new tag.LongTag(this.readLong());
    } else if (id == 5) {
      return new tag.FloatTag(this.readFloat());
    } else if (id == 6) {
      return new tag.DoubleTag(this.readDouble());
    } else if (id == 7) {
      return new tag.ByteArrayTag(this.readByteArray());
    } else if (id == 8) {
      return new tag.StringTag(this.readString());
    } else if (id == 9) {
      return new tag.ListTag(this.readList());
    } else if (id == 10) {
      return new tag.CompoundTag(this.readCompound());
    } else if (id == 11) {
      return new tag.IntArrayTag(this.readIntArray());
    } else if (id == 12) {
      return new tag.LongArrayTag(this.readLongArray());
    } else {
      throw new Error(`Invalid tag id ${id}`);
    }
  }

  readCompoundTag() {
    const id = this.readByte();

    if (id == 0) {
      return null;
    } else if (id != 10) {
      if (id != 10) throw new Error("Root tag must be a compound tag!");
    }

    this.readString();

    return new tag.CompoundTag(this.readCompound());
  }
}
