import { Component } from "../chat/component.ts";

export class Item {
  name: string;
  maxStackSize: number;
  maxDamage: number;
  isFireResistant: boolean;
  craftingRemainingItem: Item | null;

  constructor(name: string, properties: ItemProperties) {
    this.name = name;
    this.maxStackSize = properties.maxStackSize ?? 64;
    this.maxDamage = properties.maxDamage ?? 0;
    this.isFireResistant = properties.isFireResistant ?? false;
    this.craftingRemainingItem = properties.craftingRemainingItem ?? null;
  }

  getDescription(): Component {
    return Component.translatable("item.minecraft." + this.name);
  }
}

export interface ItemProperties {
  maxStackSize?: number;
  maxDamage?: number;
  isFireResistant?: boolean;
  craftingRemainingItem?: Item | null;
}
