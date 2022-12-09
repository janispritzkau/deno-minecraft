export class ResourceLocation {
  constructor(public namespace: string, public path: string) {
    if (/[^0-9a-z_\.-]/.test(namespace)) {
      throw new Error("Invalid characters in resource namespace");
    }
    if (/[^0-9a-z_\.\/-]/.test(path)) {
      throw new Error("Invalid characters in resource path");
    }
  }

  static from(location: string) {
    const parts = location.split(":");
    if (parts.length > 2) throw new Error("Invalid resource location format");
    return parts.length == 2
      ? new ResourceLocation(parts[0], parts[1])
      : new ResourceLocation("minecraft", parts[0]);
  }

  toString(): string {
    return this.namespace + ":" + this.path;
  }

  [Symbol.for("Deno.customInspect")](inspect: typeof Deno.inspect, options: Deno.InspectOptions) {
    return `ResourceLocation(${inspect(this.toString(), options)})`;
  }
}
