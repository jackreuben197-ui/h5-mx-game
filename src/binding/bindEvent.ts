export interface Binding {
  event: string;
  source: string;
  method: string | symbol;
  priority: number;
  initIgnore: boolean;
}
const metadata = new WeakMap<object, Binding[]>();
export function bindEvent(
  event: string,
  source: string | { dataSource: string; initPriority?: number; initIgnore?: boolean },
): MethodDecorator {
  return (target, method) => {
    const config = typeof source === 'string' ? { dataSource: source } : source;
    const bindings = metadata.get(target) ?? [];
    bindings.push({
      event,
      method,
      source: config.dataSource,
      priority: config.initPriority ?? 0,
      initIgnore: config.initIgnore ?? false,
    });
    metadata.set(target, bindings);
  };
}
export function getBindings(component: object): Binding[] {
  const result: Binding[] = [],
    methods = new Set<string | symbol>();
  for (let p = Object.getPrototypeOf(component); p; p = Object.getPrototypeOf(p))
    for (const binding of metadata.get(p) ?? []) {
      if (!methods.has(binding.method)) {
        result.push(binding);
        methods.add(binding.method);
      }
    }
  return result.sort((a, b) => b.priority - a.priority);
}
