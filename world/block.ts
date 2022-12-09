import { BlockState, BlockStateDefinition } from "./block_state.ts";
import { Property } from "./block_state_property.ts";

export class Block {
  name: string;
  defaultState: BlockState;
  #stateDefinition: BlockStateDefinition;

  constructor(name: string) {
    this.name = name;
    this.#stateDefinition = new BlockStateDefinition(this, this.getProperties());
    this.defaultState = this.#stateDefinition.possibleStates[0];
  }

  get stateDefinition(): BlockStateDefinition {
    return this.#stateDefinition;
  }

  getProperties(): Property[] {
    return [];
  }
}
