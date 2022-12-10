import { Block } from "./block.ts";
import { Property } from "./block_state_property.ts";

export class BlockState {
  state: Record<string, unknown>;
  #definition: BlockStateDefinition;
  #index: number;

  constructor(definition: BlockStateDefinition, state: Record<string, unknown>, index: number) {
    this.state = Object.freeze(state);
    this.#definition = definition;
    this.#index = index;
  }

  get block(): Block {
    return this.#definition.block;
  }

  has(property: Property): boolean {
    return this.#definition.has(property);
  }

  get<T>(property: Property<T>): T {
    if (!this.#definition.has(property)) {
      throw new Error(`Block state does not have property '${property.name}'`);
    }

    return this.state[property.name] as T;
  }

  set<P extends Property>(property: P, value: P extends Property<infer T> ? T : never): BlockState {
    if (!this.#definition.has(property)) {
      throw new Error(`Block state does not have property '${property.name}'`);
    }

    if (!property.possibleValues.includes(value)) {
      throw new Error(`Value '${value}' cannot be assigned to property ${property.name}`);
    }

    const offset = this.#definition.getOffset(property, this.get(property), value);
    return this.#definition.possibleStates[this.#index + offset];
  }
}

export class BlockStateDefinition {
  block: Block;
  properties: readonly Property[];
  #propertySet: Set<Property>;
  #possibleStates: readonly BlockState[];
  #propertyOffsets: Record<string, number[]>;

  constructor(block: Block, properties: Property[]) {
    this.block = block;
    this.properties = Object.freeze([...properties].sort());
    this.#propertySet = new Set(properties);

    const states: BlockState[] = [];
    const indices = Array(properties.length).fill(0);
    let i: number;
    do {
      const state = Object.fromEntries(
        properties.map((property, i) => [property.name, property.possibleValues[indices[i]]]),
      );
      states.push(new BlockState(this, state, states.length));
      for (i = indices.length - 1; i >= 0; i--) {
        indices[i] = (indices[i] + 1) % properties[i].possibleValues.length;
        if (indices[i] > 0) break;
      }
    } while (i >= 0);

    this.#possibleStates = Object.freeze(states);

    this.#propertyOffsets = {};
    for (let offset = 1, index = properties.length; index--;) {
      const property = properties[index];
      this.#propertyOffsets[property.name] = property.possibleValues.map((_, i) => i * offset);
      offset *= property.possibleValues.length;
    }
  }

  get possibleStates(): readonly BlockState[] {
    return this.#possibleStates;
  }

  has(property: Property) {
    return this.#propertySet.has(property);
  }

  getOffset<T>(property: Property<T>, from: T, to: T): number {
    const offsets = this.#propertyOffsets[property.name];
    return offsets[property.possibleValues.indexOf(to)] -
      offsets[property.possibleValues.indexOf(from)];
  }
}
