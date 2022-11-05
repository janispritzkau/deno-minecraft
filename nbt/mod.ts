/**
 * An implementation of Minecraft's named binary tag (NBT) format.
 *
 * ### Creating and readings tags
 *
 * ```ts
 * import {
 *   ByteArrayTag,
 *   ByteTag,
 *   CompoundTag,
 *   LongTag,
 *   StringTag,
 * } from "https://deno.land/x/minecraft_lib/nbt/mod.ts";
 *
 * const compound = new CompoundTag({
 *   long: new LongTag(-1n),
 *   byteArray: new ByteArrayTag([1, 2, 3, 4]),
 * });
 *
 * compound
 *   .set("nestedCompound", new CompoundTag())
 *   .setString("string", "hello")
 *   .setList("list", [new StringTag("hello")])
 *   .setBoolean("boolean", true);
 *
 * const tag = compound.get("boolean");
 * if (tag instanceof ByteTag) {
 *   const byte: number = tag.valueOf();
 *   console.log(byte);
 * }
 *
 * if (compound.getBoolean("boolean")) {
 *   console.log(compound
 *     .getList("list", StringTag)!
 *     .map((tag) => tag.valueOf()));
 * }
 * ```
 *
 * ### Reading from file
 *
 * ```ts
 * import { CompoundTag, decodeCompoundTag } from "https://deno.land/x/minecraft_lib/nbt/mod.ts";
 *
 * const tag = decodeCompoundTag(Deno.readFileSync("servers.dat"))!;
 *
 * const servers = tag.getList("servers", CompoundTag)!.map((tag) => {
 *   return {
 *     name: tag.getString("name"),
 *     ip: tag.getString("ip"),
 *     hidden: tag.getBoolean("hidden"),
 *   };
 * });
 * ```
 *
 * ### Parse and stringify tags
 *
 * ```ts
 * import { parse, stringify, Tag } from "https://deno.land/x/minecraft_lib/nbt/mod.ts";
 *
 * const tag: Tag = parse(`{
 *   unquoted: string,
 *   "quoted_key": '[{"text":"hello"}]',
 *   pages: ["page 1", 'page 2'],
 *   array: [B; -128b, 127b, +0b],
 *   floats: [0.5f, -1.10E-5f, 1E6F],
 *   bytes: [true, false, 1b, 0b],
 * }`);
 *
 * const snbt = stringify(tag);
 * console.log(snbt);
 * ```
 *
 * @module
 */

export * from "./io.ts";
export * from "./snbt.ts";
export * from "./tag.ts";
