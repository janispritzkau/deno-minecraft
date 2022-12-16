import { Reader, Writer } from "../io/mod.ts";
import { CompoundTag } from "./tag.ts";
import { TagReader, TagWriter } from "./_io.ts";
import { IO_GET_ID } from "./_tag.ts";

export function readCompoundTag(reader: Reader): CompoundTag | null {
  const tagReader = new TagReader(reader);
  const id = tagReader.readByte();
  if (id == 0) return null;
  if (id != 10) throw new Error("Root tag must be a compound tag");
  tagReader.readString();
  return new CompoundTag(tagReader.readCompound());
}

export function writeCompoundTag(writer: Writer, tag: CompoundTag | null): void {
  const tagWriter = new TagWriter(writer);
  if (tag == null) {
    tagWriter.writeByte(0);
    return;
  }
  tagWriter.writeByte(tag[IO_GET_ID]());
  tagWriter.writeShort(0);
  tagWriter.write(tag);
}

export function decodeCompoundTag(buf: Uint8Array): CompoundTag | null {
  return readCompoundTag(new Reader(buf));
}

export function encodeCompoundTag(tag: CompoundTag | null): Uint8Array {
  const writer = new Writer();
  writeCompoundTag(writer, tag);
  return writer.bytes();
}
