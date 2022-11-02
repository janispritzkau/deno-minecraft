export { Reader } from "./reader.ts";
export { Writer } from "./writer.ts";

export function getVarIntSize(x: number) {
  let n = 0;
  do {
    x >>>= 7;
    n += 1;
  } while (x != 0);
  return n;
}
