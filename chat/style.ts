import * as json from "../_utils/json.ts";
import { Component } from "./component.ts";
import {
  JsonClickEvent,
  JsonComponentBase,
  JsonHoverEvent,
  JsonHoverEventLegacy,
} from "./_json.ts";

export class Style {
  color: string | null = null;
  bold: boolean | null = null;
  italic: boolean | null = null;
  underlined: boolean | null = null;
  strikethrough: boolean | null = null;
  obfuscated: boolean | null = null;
  // TODO: implement ClickEvent class
  clickEvent: JsonClickEvent | null = null;
  // TODO: implement HoverEvent class
  hoverEvent: JsonHoverEvent | JsonHoverEventLegacy | null = null;
  insertion: string | null = null;

  clone(): Style {
    const style = new Style();
    style.color = this.color;
    style.bold = this.bold;
    style.italic = this.italic;
    style.underlined = this.underlined;
    style.strikethrough = this.strikethrough;
    style.obfuscated = this.obfuscated;
    style.clickEvent = this.clickEvent;
    style.hoverEvent = this.hoverEvent;
    style.insertion = this.insertion;
    return style;
  }

  merge(other: Style) {
    const style = other.clone();
    style.color ??= this.color;
    style.bold ??= this.bold;
    style.italic ??= this.italic;
    style.underlined ??= this.underlined;
    style.strikethrough ??= this.strikethrough;
    style.obfuscated ??= this.obfuscated;
    style.clickEvent ??= this.clickEvent;
    style.hoverEvent ??= this.hoverEvent;
    style.insertion ??= this.insertion;
    return style;
  }

  static deserialize(value: Record<string, unknown>): Style {
    const style = new Style();
    if ("color" in value) style.color = json.asString(value.color);
    if ("bold" in value) style.bold = json.asBoolean(value.bold);
    if ("italic" in value) style.italic = json.asBoolean(value.italic);
    if ("underlined" in value) style.underlined = json.asBoolean(value.underlined);
    if ("strikethrough" in value) style.strikethrough = json.asBoolean(value.strikethrough);
    if ("obfuscated" in value) style.obfuscated = json.asBoolean(value.obfuscated);
    if ("clickEvent" in value) {
      const clickEvent = json.asObject(value.clickEvent);
      style.clickEvent = { action: json.asString(clickEvent.action), value: clickEvent.value };
    }
    if ("hoverEvent" in value) {
      const hoverEvent = json.asObject(value.hoverEvent);
      const action = json.asString(hoverEvent.action);
      if ("contents" in hoverEvent) {
        style.hoverEvent = { action, contents: hoverEvent.contents };
      } else if ("value" in hoverEvent) {
        style.hoverEvent = { action, value: Component.deserialize(hoverEvent.value).serialize() };
      }
    }
    return style;
  }

  serialize(value: JsonComponentBase) {
    if (this.color != null) value.color = this.color;
    if (this.bold != null) value.bold = this.bold;
    if (this.italic != null) value.italic = this.italic;
    if (this.underlined != null) value.underlined = this.underlined;
    if (this.strikethrough != null) value.strikethrough = this.strikethrough;
    if (this.obfuscated != null) value.obfuscated = this.obfuscated;
  }
}
