import { CompoundTag } from "./tag.ts";
import { NBTReader } from "./reader.ts";
import { NBTWriter } from "./writer.ts";

export * from "./tag.ts";

export function decodeCompoundTag(buf: Uint8Array): CompoundTag | null {
  return new NBTReader(buf)
    .readCompoundTag();
}

export function encodeCompoundTag(tag: CompoundTag | null): Uint8Array {
  const writer = new NBTWriter();
  writer.writeCompoundTag(tag);
  return writer.bytes();
}

export { CompoundTag };
