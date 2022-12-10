export class BlockPos {
  readonly x: number;
  readonly y: number;
  readonly z: number;

  constructor(x: number, y: number, z: number) {
    this.x = Math.floor(x);
    this.y = Math.floor(y);
    this.z = Math.floor(z);
    Object.freeze(this);
  }

  clone(): BlockPos {
    return new BlockPos(this.x, this.y, this.z);
  }

  static unpack(value: bigint): BlockPos {
    return new BlockPos(
      Number(value >> 38n & 0x3ffffffn) << 6 >> 6,
      Number(value & 0xfffn) << 20 >> 20,
      Number(value >> 12n & 0x3ffffffn) << 6 >> 6,
    );
  }

  pack(): bigint {
    return (
      BigInt(this.x & 0x3ffffff) << 38n |
      BigInt(this.y & 0xfff) |
      BigInt(this.z & 0x3ffffff) << 12n
    );
  }
}
