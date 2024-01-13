import * as json from "../_utils/json.ts";
import { cyan } from "../deps.ts";
import { JsonComponent, JsonTextComponent, JsonTranslatableComponent } from "./_json.ts";
import { Style } from "./style.ts";

export abstract class Component {
  children: Component[] = [];
  style = new Style();

  static literal(text: string) {
    return new LiteralComponent(text);
  }

  static translatable(key: string, ...args: Component[]) {
    return new TranslatableComponent(key, args);
  }

  static deserialize(value: unknown): Component {
    if (json.isPrimitive(value)) return this.literal(value.toString());

    if (value instanceof Array) {
      if (value.length == 0) throw new Error("Array must not be empty");
      const component = this.deserialize(value[0]);
      for (let i = 1; i < value.length; i++) component.append(this.deserialize(value[i]));
      return component;
    }

    json.assertIsObject(value);
    let component: Component;

    if ("text" in value) {
      component = this.literal(json.asString(value.text));
    } else if ("translate" in value) {
      const key = json.asString(value.translate);
      if ("with" in value) {
        const args = json.asArray(value.with).map((arg) => this.deserialize(arg));
        component = this.translatable(key, ...args);
      } else {
        component = this.translatable(key);
      }
    } else {
      throw new Error("Invalid chat component");
    }

    if ("extra" in value) {
      const extra = json.asArray(value.extra);
      if (extra.length == 0) throw new Error("Array 'extra' must not be empty");
      for (const value of extra) component.append(this.deserialize(value));
    }

    component.style = Style.deserialize(value);

    return component;
  }

  serialize(): JsonComponent {
    let value: JsonTextComponent | JsonTranslatableComponent;

    if (this instanceof LiteralComponent) {
      value = { text: this.text };
    } else if (this instanceof TranslatableComponent) {
      value = {
        translate: this.key,
        with: this.args.map((arg) => arg.serialize()),
      };
    } else {
      throw new Error("Invalid component type");
    }

    if (this.children.length > 0) {
      value.extra = this.children.map((component) => component.serialize());
    }

    this.style.serialize(value);

    return value;
  }

  append(component: Component) {
    this.children.push(component);
  }

  [Symbol.for("Deno.customInspect")](
    inspect: typeof Deno.inspect,
    options: Deno.InspectOptions & { indentLevel: number; depth: number },
  ) {
    if (options.indentLevel >= options.depth) return cyan("[Component]");
    return `Component(${inspect(this.serialize(), options)})`;
  }
}

export class LiteralComponent extends Component {
  constructor(public text: string) {
    super();
  }
}

export class TranslatableComponent extends Component {
  constructor(public key: string, public args: Component[]) {
    super();
  }
}
