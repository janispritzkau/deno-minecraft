import {
  ByteArrayTag,
  ByteTag,
  CompoundTag,
  DoubleTag,
  FloatTag,
  IntArrayTag,
  IntTag,
  ListTag,
  LongArrayTag,
  LongTag,
  ShortTag,
  StringTag,
  Tag,
} from "./tag.ts";

const WHITESPACE_PATTERN = /\s+/;
const UNQUOTED_STRING_PATTERN = /^[0-9a-z_\-.+]+$/i;
const UNQUOTED_STRING_OPEN_PATTERN = /^[0-9a-z_\-.+]+/i;
const INTEGER_PATTERN = /^([-+]?(?:0|[1-9][0-9]*))([bls]?)$/i;
const FLOAT_PATTERN = /^([-+]?(?:[0-9]+[.]?|[0-9]*[.][0-9]+)(?:e[-+]?[0-9]+)?)([df]?)$/i;
const TRUE_PATTERN = /^true$/i;
const FALSE_PATTERN = /^false$/i;

/** Converts a named binary tag to the stringified representation. */
export function stringify(tag: Tag): string {
  if (tag instanceof ByteTag) return `${tag.valueOf()}b`;
  if (tag instanceof ShortTag) return `${tag.valueOf()}s`;
  if (tag instanceof IntTag) return `${tag.valueOf()}`;
  if (tag instanceof LongTag) return `${tag.valueOf()}L`;
  if (tag instanceof FloatTag) return `${tag.valueOf()}f`;
  if (tag instanceof DoubleTag) return `${tag.valueOf()}d`;
  if (tag instanceof ByteArrayTag) return stringifyList(tag.toList(), "B;");
  if (tag instanceof StringTag) return escapeWithQuotes(tag.valueOf());
  if (tag instanceof ListTag) return stringifyList(tag.valueOf());
  if (tag instanceof CompoundTag) return stringifyCompound(tag.valueOf());
  if (tag instanceof IntArrayTag) return stringifyList(tag.toList(), "I;");
  if (tag instanceof LongArrayTag) return stringifyList(tag.toList(), "L;");
  throw new Error("Invalid tag");
}

function stringifyCompound(map: Map<string, Tag>) {
  return `{${[...map].map(([k, v]) => `${stringifyKey(k)}:${stringify(v)}`).join(",")}}`;
}

function stringifyList(list: Tag[], typePrefix?: string) {
  return `[${typePrefix ?? ""}${list.map((tag) => stringify(tag)).join(",")}]`;
}

function stringifyKey(key: string) {
  return UNQUOTED_STRING_PATTERN.test(key) ? key : escapeWithQuotes(key);
}

const SINGLE_QUOTE_ESCAPE_PATTERN = /['\\]/g;
const DOUBLE_QUOTE_ESCAPE_PATTERN = /["\\]/g;

function escapeWithQuotes(text: string) {
  const singleQuoteString = text
    .replace(SINGLE_QUOTE_ESCAPE_PATTERN, escapeChar);
  const doubleQuoteString = text
    .replace(DOUBLE_QUOTE_ESCAPE_PATTERN, escapeChar);
  return singleQuoteString.length < doubleQuoteString.length
    ? `'${singleQuoteString}'`
    : `"${doubleQuoteString}"`;
}

function escapeChar(char: string) {
  return `\\${char}`;
}

export interface ParseOptions {
  /**
   * Enables lenient parsing.
   *
   * This allows for newline-separated key-value pairs and list items,
   * and omitting type specifiers on items in typed arrays
   * (e.g. `[B; 0, 1]` instead of `[B; 0b, 1b]`).
   */
  lenient?: boolean;
}

/** Parses a stringified named binary tag. */
export function parse(text: string, options: ParseOptions = {}): Tag {
  const parser = new TagParser(text, options.lenient);
  return parser.parseTag();
}

class TagParser {
  #text: string;
  #lenient: boolean;
  #pos = 0;

  constructor(text: string, lenient = false) {
    this.#text = text;
    this.#lenient = lenient;
  }

  parseTag(): Tag {
    const tag = this.readTag();
    const endPos = this.#pos;
    this.#skipWhitespace();

    if (this.#canRead()) {
      if (this.#pos > endPos || tag instanceof CompoundTag || tag instanceof ListTag) {
        throw new Error("Unexpected non-whitespace character after tag");
      } else {
        throw new Error(`Unexpected character '${this.#peek()}' at end of tag`);
      }
    }
    return tag;
  }

  readTag(tagType?: Tag["constructor"]) {
    this.#skipWhitespace();

    if (!this.#canRead()) throw new Error("Expected tag");

    const char = this.#text[this.#pos];
    if (char == "{") return this.readCompoundTag();
    if (char == "[") return this.readList();
    if (char == '"' || char == "'") {
      return new StringTag(this.readQuotedString(char));
    }

    const string = this.readUnquotedString();
    if (string == null) {
      throw new Error(
        `Unexpected character '${char}' while reading tag`,
      );
    }

    try {
      let match = string.match(INTEGER_PATTERN);
      if (match) {
        const c = match[2];
        if (c == "b" || c == "B" || !c && tagType == ByteTag) {
          return new ByteTag(validateInt(Number(match[1]), 8));
        } else if (c == "s" || c == "S" || !c && tagType == ShortTag) {
          return new ShortTag(validateInt(Number(match[1]), 16));
        } else if (c == "l" || c == "L" || !c && tagType == LongTag) {
          return new LongTag(validateLong(BigInt(match[1])));
        } else {
          return new IntTag(validateInt(Number(match[1]), 32));
        }
      }

      match = string.match(FLOAT_PATTERN);
      if (match) {
        if (match[2] == "f" || match[2] == "F") {
          return new FloatTag(Number(match[1]));
        }
        return new DoubleTag(Number(match[1]));
      }

      if (TRUE_PATTERN.test(string)) return new ByteTag(1);
      if (FALSE_PATTERN.test(string)) return new ByteTag(0);
    } catch {
      return new StringTag(string);
    }
    return new StringTag(string);
  }

  readCompoundTag() {
    this.#skipWhitespace();
    this.#expect("{");
    const tag = new CompoundTag();
    while (this.#canRead() && this.#peek() != "}") {
      this.#skipWhitespace();

      const key = this.readString();
      if (key == null) {
        throw new Error(
          `Unexpected character '${this.#peek()}' while expecting key-value pair or '}'`,
        );
      }
      if (key == "") throw new Error("Key cannot be empty");

      this.#skipWhitespace();
      this.#expect(":");
      tag.set(key, this.readTag());

      if (!this.#skipSeperator()) {
        if (this.#peek() != "}") {
          throw new Error(`Unexpected character '${this.#peek()}' while expecting seperator`);
        }
        break;
      }
    }
    if (!this.#canRead()) throw new Error("Expected key-value pair or '}'");
    this.#skip();
    return tag;
  }

  readList(): Tag {
    this.#expect("[");

    let tagType: Tag["constructor"] | undefined;
    let isArray = false;

    if (this.#canRead(2) && this.#peek(1) == ";") {
      const char = this.#peek();
      if (char == "B") {
        tagType = ByteTag;
      } else if (char == "I") {
        tagType = IntTag;
      } else if (char == "L") {
        tagType = LongTag;
      } else {
        throw new Error(`Invalid array type '${char}'`);
      }
      isArray = true;
      this.#skip(2);
    }

    this.#skipWhitespace();
    const tags: Tag[] = [];

    while (this.#canRead() && this.#peek() != "]") {
      const tag = isArray ? this.readTag(tagType) : this.readTag();

      if (tagType == null) {
        tagType = tag.constructor;
      } else if (!(tag instanceof tagType)) {
        throw new Error(
          `Expected tag of type ${tagType.name} but got ${tag.constructor}`,
        );
      }

      tags.push(tag);

      if (!this.#skipSeperator()) {
        if (this.#peek() != "]") {
          throw new Error(`Unexpected character '${this.#peek()}' while expecting seperator`);
        }
        break;
      }
    }

    if (!this.#canRead()) throw Error("Expected tag or ']'");
    this.#expect("]");

    if (isArray) {
      if (tagType == ByteTag) {
        const array = new Uint8Array(tags.length);
        for (let i = 0; i < tags.length; i++) {
          array[i] = tags[i].valueOf() as number;
        }
        return new ByteArrayTag(array);
      }
      if (tagType == IntTag) {
        const array = new Int32Array(tags.length);
        for (let i = 0; i < tags.length; i++) {
          array[i] = tags[i].valueOf() as number;
        }
        return new IntArrayTag(array);
      }
      if (tagType == LongTag) {
        const array = new BigInt64Array(tags.length);
        for (let i = 0; i < tags.length; i++) {
          array[i] = tags[i].valueOf() as bigint;
        }
        return new LongArrayTag(array);
      }
    }

    return new ListTag(tags);
  }

  readString() {
    const char = this.#peek();
    return char == '"' || char == "'" ? this.readQuotedString(char) : this.readUnquotedString();
  }

  readUnquotedString() {
    const match = this.#text.slice(this.#pos).match(
      UNQUOTED_STRING_OPEN_PATTERN,
    );
    if (!match) return null;
    this.#pos += match[0].length;
    return match[0];
  }

  readQuotedString(quoteChar: string) {
    let lastPos = ++this.#pos;
    let string = "";
    while (this.#canRead()) {
      const char = this.#next();
      if (char == "\\") {
        if (!this.#canRead()) {
          throw new Error("Unexpected end while reading escape sequence");
        }
        const escapeChar = this.#peek();
        if (escapeChar != quoteChar && escapeChar != "\\") {
          throw new Error(`Invalid escape character '${escapeChar}'`);
        }
        string += this.#text.slice(lastPos, this.#pos - 1) + escapeChar;
        lastPos = ++this.#pos;
      } else if (char == quoteChar) {
        return string + this.#text.slice(lastPos, this.#pos - 1);
      }
    }
    throw new Error(`Missing end quote`);
  }

  #canRead(len = 1) {
    return this.#pos + len <= this.#text.length;
  }

  #peek(off = 0) {
    return this.#text[this.#pos + off];
  }

  #next() {
    return this.#text[this.#pos++];
  }

  #skip(len = 1) {
    this.#pos += len;
  }

  #skipSeperator() {
    let hasNewline = false;
    while (this.#canRead() && WHITESPACE_PATTERN.test(this.#peek())) {
      if (this.#peek() == "\n") hasNewline = true;
      this.#skip();
    }
    if (this.#canRead() && this.#peek() == ",") {
      this.#skip();
      this.#skipWhitespace();
      return true;
    } else {
      return this.#lenient && this.#canRead() ? hasNewline : false;
    }
  }

  #skipWhitespace() {
    while (this.#canRead() && WHITESPACE_PATTERN.test(this.#peek())) {
      this.#skip();
    }
  }

  #expect(char: string) {
    if (!this.#canRead() || this.#peek() != char) {
      throw new Error(`Expected '${char}'`);
    }
    this.#pos += 1;
  }
}

function validateInt(value: number, bits: number) {
  if (-1 << (bits - 1) <= value && value < 1 << (bits - 1) >>> 0) return value;
  throw new Error("Integer out of bounds");
}

function validateLong(value: bigint) {
  if (-1n << 63n <= value && value < 1n << 63n) return value;
  throw new Error("Integer out of bounds");
}
