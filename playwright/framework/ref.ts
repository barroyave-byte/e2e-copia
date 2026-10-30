/**
 * References to values produced by earlier steps.
 *
 * A step can publish its return value with `saveAs`, and any later step can consume it by
 * putting `ref('name')` where the value goes:
 *
 * ```ts
 * { action: 'setup.processor.createProcessor', params: { processorConfig }, saveAs: 'processorId' }
 * { action: 'setup.processor.deleteProcessor', params: { processorId: ref('processorId') } }
 * ```
 *
 * Before this existed, `run()` discarded every action's return value (`ActionFunction`
 * returned `Promise<void>`), so a value created in one step could only reach another through
 * `process.env`. That made the dependency invisible in the spec and leaked state between
 * specs sharing a worker.
 */

const STEP_REF = Symbol('dsl.stepRef');

export interface StepRef<T = unknown> {
  readonly [STEP_REF]: true;
  readonly key: string;
  /** Optional path into the saved value, e.g. `ref('order').at('data.token')`. */
  readonly path?: string;
  at(path: string): StepRef<T>;
}

/**
 * Marks a placeholder for a value saved by an earlier step.
 *
 * Typed as `any` on purpose: a reference stands in for a value whose type the step's own
 * parameter interface already declares, so returning `any` lets it slot into a `string`,
 * `number` or object field without every call site needing a cast. The key itself is still
 * validated at run time against the saved keys, with the available names in the error.
 */
export function ref(key: string, path?: string): any {
  const self: StepRef = {
    [STEP_REF]: true,
    key,
    path,
    at(nextPath: string) {
      return ref(key, nextPath) as StepRef;
    },
  };
  return self;
}

export function isStepRef(value: unknown): value is StepRef {
  return typeof value === 'object' && value !== null && STEP_REF in value;
}

/** Walks a dotted path into a saved value. */
export function readPath(value: unknown, path: string, key: string): unknown {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (current === null || current === undefined) {
      throw new Error(
        `ref('${key}').at('${path}'): "${segment}" is unreachable — the value is ${current}.`
      );
    }
    return (current as Record<string, unknown>)[segment];
  }, value);
}
