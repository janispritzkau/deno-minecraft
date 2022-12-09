import { IdMapper } from "./id_mapper.ts";

export class Registry<Value, Key extends string = string> {
  #keyMap = new IdMapper<Key>();
  #valueMap = new IdMapper<Value>();
  #defaultKey: Key | null;

  constructor(defaultKey?: Key) {
    this.#defaultKey = defaultKey ?? null;
  }

  get size(): number {
    return this.#keyMap.size;
  }

  keys(): Iterable<string> {
    return this.#keyMap.values();
  }

  values(): Iterable<Value> {
    return this.#valueMap.values();
  }

  *entries(): Iterable<[string, Value]> {
    for (const value of this.#valueMap.values()) {
      yield [this.getKey(value)!, value];
    }
  }

  register<T extends Value>(key: Key, value: T): T {
    this.#keyMap.add(key);
    this.#valueMap.add(value);
    return value;
  }

  getById(id: number): Value | null {
    return this.getById(id) ?? (this.#defaultKey ? this.getByKey(this.#defaultKey) : null);
  }

  /** Returns `-1` if no value is found. */
  getId(value: Value): number {
    return this.#valueMap.getId(value);
  }

  getByKey(key: Key): Value | null {
    return this.#valueMap.getById(this.#keyMap.getId(key));
  }

  getKey(value: Value): Key | null {
    return this.#keyMap.getById(this.getId(value));
  }
}
