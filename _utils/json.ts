export function asObject(value: unknown): Record<string, unknown> {
  assertIsObject(value);
  return value;
}

export function asArray(value: unknown): unknown[] {
  assertIsArray(value);
  return value;
}

export function asString(value: unknown): string {
  if (!isPrimitive(value)) {
    throw new Error("Cannot convert value into string");
  }
  return value.toString();
}

export function asNumber(value: unknown): number {
  if (typeof value != "number") {
    throw new Error("Value is not of type number");
  }
  return value;
}

export function asBoolean(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value != "boolean") {
    throw new Error("Value is not of type boolean");
  }
  return value;
}

export function assertIsObject(value: unknown): asserts value is Record<string, unknown> {
  if (value == null || value.constructor != Object) {
    throw new Error("Expected value to be a object");
  }
}

export function assertIsArray(value: unknown): asserts value is unknown[] {
  if (!(value instanceof Array)) {
    throw new Error("Expected value to be an array");
  }
}

export function isPrimitive(value: unknown): value is string | number | boolean {
  return typeof value == "string" || typeof value == "number" || typeof value == "boolean";
}
