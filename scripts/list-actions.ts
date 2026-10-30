import { Project } from 'ts-morph';
import * as path from 'path';
import { defaultPlugins } from '../playwright/framework/core';
import { extractDescription } from './lib/actionDescription';

/**
 * Prints the catalog: every registered action with its description, one per line.
 *
 * Reads the plugin sources with ts-morph rather than reflecting over the plugin objects.
 * Descriptions live in JSDoc now, and JSDoc above a method is not part of what
 * `Function.prototype.toString()` returns — there is nothing left to reflect on at run time.
 * The registry still comes from `defaultPlugins`, so a plugin that exists on disk but is not
 * registered never reaches the catalog.
 */
function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const project = new Project({ tsConfigFilePath: path.join(projectRoot, 'tsconfig.json') });

  const registered = new Set(defaultPlugins.map((PluginClass) => new PluginClass().pluginBaseName));
  const lines: string[] = [];

  for (const sourceFile of project.getSourceFiles('**/playwright/framework/plugins/**/*.ts')) {
    for (const classDecl of sourceFile.getClasses()) {
      if (classDecl.getExtends()?.getText() !== 'FrameworkPlugin') continue;

      const baseName = classDecl
        .getProperty('pluginBaseName')
        ?.getInitializer()
        ?.getText()
        .replace(/['"]/g, '');

      if (!baseName || !registered.has(baseName)) continue;

      for (const method of classDecl.getMethods()) {
        const name = method.getName();
        if (!name.startsWith('$tf_')) continue;

        lines.push(`${baseName}.${name.slice(4)} — ${extractDescription(method)}`);
      }
    }
  }

  // Sorted so the catalog is stable: it no longer depends on plugin registration order or on
  // the order the file system hands back sources.
  console.log(lines.sort().join('\n'));
}

main();
