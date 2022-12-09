export abstract class Property<T = unknown> {
  #values: readonly T[];

  constructor(public name: string, values: readonly T[]) {
    this.#values = Object.freeze(values);
  }

  get possibleValues(): readonly T[] {
    return this.#values;
  }
}

export class BooleanProperty extends Property<boolean> {
  constructor(name: string) {
    super(name, [true, false]);
  }
}

export class IntegerProperty extends Property<number> {
  constructor(name: string, public min: number, public max: number) {
    const values: number[] = [];
    for (let value = min; value <= max; value++) values.push(value);
    super(name, values);
  }
}

export class EnumProperty<T extends string> extends Property<T> {
  constructor(name: string, public variants: readonly T[]) {
    super(name, variants);
  }
}
