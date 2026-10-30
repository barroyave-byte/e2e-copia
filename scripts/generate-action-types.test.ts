import * as assert from 'assert';
import { Project } from 'ts-morph';
import { paramsMayBeOmitted } from './generate-action-types';

const project = new Project({ useInMemoryFileSystem: true });
const source = project.createSourceFile(
  'plugin.ts',
  `
    class Plugin {
      requiredUnion(params: { fromIsoDay: string; toIsoDay: string } | { fromDaysAgo: number }) {}
      optionalUnion(params: { fromIsoDay?: string } | { fromDaysAgo?: number }) {}
      defaulted(params: { value: string } = { value: 'default' }) {}
    }
  `
);
const plugin = source.getClassOrThrow('Plugin');

assert.strictEqual(
  paramsMayBeOmitted(plugin.getMethodOrThrow('requiredUnion').getParameters()[0]),
  false,
  'A union whose alternatives require fields must require params'
);
assert.strictEqual(
  paramsMayBeOmitted(plugin.getMethodOrThrow('optionalUnion').getParameters()[0]),
  true,
  'A union whose alternatives only contain optional fields may omit params'
);
assert.strictEqual(
  paramsMayBeOmitted(plugin.getMethodOrThrow('defaulted').getParameters()[0]),
  true,
  'A parameter with a default value may be omitted'
);
