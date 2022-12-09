export class IdMapper<Value> {
  #values: Value[] = [];
  #valueIds = new Map<Value, number>();

  get size(): number {
    return this.#values.length;
  }

  values(): Iterable<Value> {
    return this.#values.values();
  }

  entries(): Iterable<[number, Value]> {
    return this.#values.entries();
  }

  add(value: Value): void {
    this.#valueIds.set(value, this.#values.length);
    this.#values.push(value);
  }

  getById(id: number): Value | null {
    return this.#values[id] ?? null;
  }

  /** Returns -1 if no value is found. */
  getId(value: Value): number {
    return this.#valueIds.get(value) ?? -1;
  }
}
