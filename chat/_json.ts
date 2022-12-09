export type JsonComponent =
  | string
  | JsonComponent[]
  | JsonTextComponent
  | JsonTranslatableComponent
  | JsonScoreComponent;

export interface JsonComponentBase {
  extra?: JsonComponent[];
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underlined?: boolean;
  strikethrough?: boolean;
  obfuscated?: boolean;
  clickEvent?: JsonClickEvent;
  hoverEvent?: JsonHoverEvent | JsonHoverEventLegacy;
  insertion?: string;
}

export interface JsonTextComponent extends JsonComponentBase {
  text: string;
}

export interface JsonTranslatableComponent extends JsonComponentBase {
  translate: string;
  with?: JsonComponent[];
}

export interface JsonScoreComponent extends JsonComponentBase {
  score: {
    name: string;
    objective: string;
  };
}

export interface JsonClickEvent {
  action: string;
  value: unknown;
}

export interface JsonHoverEvent {
  action: string;
  contents: unknown;
}

export interface JsonHoverEventLegacy {
  action: string;
  value: JsonComponent;
}
