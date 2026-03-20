import type { ParamOptions, ParamDefinition } from './types';

/**
 * Reactive parameter system for math objects.
 *
 * Creates reactive properties on owner object with automatic lifecycle hooks.
 * When a parameter changes, it can automatically trigger rebuild() or update().
 */
export class Params {
  private owner: any;
  private definitions = new Map<string, ParamDefinition>();
  private dependents = new Set<any>();
  private sources = new Set<Params>();

  constructor(owner: any) {
    this.owner = owner;
  }

  define(name: string, defaultValue: any, options: ParamOptions = {}): this {
    let currentValue = defaultValue;
    const owner = this.owner;
    const paramsInstance = this;

    Object.defineProperty(this.owner, name, {
      get() { return currentValue; },
      set(value) {
        const oldValue = currentValue;
        currentValue = value;
        if (oldValue === value) return;

        if (options.onChange) options.onChange(value);

        if (options.triggers === 'rebuild') {
          if (typeof owner.rebuild === 'function') owner.rebuild();
          for (const dep of paramsInstance.dependents) {
            if (typeof dep.rebuild === 'function') dep.rebuild();
          }
        } else if (options.triggers === 'update') {
          if (typeof owner.update === 'function') owner.update();
          for (const dep of paramsInstance.dependents) {
            if (typeof dep.update === 'function') dep.update();
          }
        }
      },
      enumerable: true,
      configurable: true,
    });

    this.definitions.set(name, { name, defaultValue, options });
    return this;
  }

  dependOn(...sources: unknown[]): this {
    for (const source of sources) {
      if (isParametric(source)) {
        source.params.addDependent(this.owner);
        this.sources.add(source.params);
      }
    }
    return this;
  }

  dispose(): void {
    for (const sourceParams of this.sources) {
      sourceParams.removeDependent(this.owner);
    }
    this.sources.clear();
  }

  addDependent(dependent: any): void { this.dependents.add(dependent); }
  removeDependent(dependent: any): void { this.dependents.delete(dependent); }

  get(name: string): any { return this.owner[name]; }
  set(name: string, value: any): void { this.owner[name] = value; }
  has(name: string): boolean { return this.definitions.has(name); }
}

export function isParametric(obj: unknown): obj is { params: Params } {
  return obj !== null &&
    typeof obj === 'object' &&
    'params' in obj &&
    (obj as any).params instanceof Params;
}
