import { CompoundTag } from "../nbt/tag.ts";
import { Item } from "./item.ts";

export class ItemStack {
  item: Item;
  count: number;
  tag: CompoundTag | null;

  constructor(item: Item, count: number, tag: CompoundTag | null) {
    this.item = item;
    this.count = count;
    this.tag = tag;
  }

  get damage(): number {
    return this.tag?.getShort("Damage") ?? 0;
  }

  set damage(value: number) {
    if (this.tag == null) this.tag = new CompoundTag();
    this.tag.setShort("Damage", value);
  }
}
