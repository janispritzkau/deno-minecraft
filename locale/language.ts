import * as json from "../_utils/json.ts";

export class Language {
  static #instance?: Language;

  #strings: Map<string, string> = new Map();

  constructor(strings: Record<string, string>) {
    for (const key in strings) {
      this.#strings.set(key, strings[key].replaceAll(/%(\d+\$)?[\d\.]*[df]/, "%$1s"));
    }
  }

  static get instance(): Language {
    if (!this.#instance) throw new Error("No default language instance was set");
    return this.#instance;
  }

  static setInstance(language: Language) {
    this.#instance = language;
  }

  static fromJson(value: unknown): Language {
    json.assertIsObject(value);
    return new Language(
      Object.fromEntries(
        Object.entries(value)
          .map(([key, value]) => [key, json.asString(value)]),
      ),
    );
  }

  has(key: string): boolean {
    return this.#strings.has(key);
  }

  get(key: string): string | null;
  get(key: string, defaultValue: string): string;
  get(key: string, defaultValue?: string): string | null {
    return this.#strings.get(key) ?? defaultValue ?? null;
  }
}
