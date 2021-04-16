export interface ClickEvent {
  action:
    | "open_url"
    | "run_command"
    | "suggest_command"
    | "change_page"
    | "copy_to_clipboard";
  value: string;
}

export interface HoverEvent {
  action:
    | "show_text"
    | "show_item"
    | "show_entity";
  value: string;
}

export interface BaseComponent {
  bold?: boolean;
  italic?: boolean;
  underlined?: boolean;
  strikethrough?: boolean;
  obfuscated?: boolean;
  color?: string;
  insertion?: string;
  clickEvent?: ClickEvent;
  hoverEvent?: HoverEvent;
  extra?: ChatComponent[];
}

export interface StringComponent extends BaseComponent {
  text: string;
}

export interface TranslationComponent extends BaseComponent {
  translate: string;
  with?: ChatComponent[];
}

export type ChatComponent = StringComponent | TranslationComponent | string;
