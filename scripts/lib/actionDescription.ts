import type { MethodDeclaration } from 'ts-morph';

/**
 * Shared extraction of an action's catalog description.
 *
 * Actions document themselves with a JSDoc `@description` tag:
 *
 * ```ts
 * /** @description Fills the credit card data in the payment widget. *\/
 * async $tf_fillCreditCardData(...) {}
 * ```
 *
 * It used to be a `'@description: ...'` string literal as the first statement of the body,
 * read back with `Function.prototype.toString()` and a regex. That worked, but it was a
 * directive-prologue expression linters flag and minifiers drop, it never showed up on hover,
 * and the regex silently truncated 11 descriptions at the first quote in their text. Reading
 * a JSDoc tag off the AST has no parsing step to get wrong.
 *
 * A tag rather than the JSDoc summary because several actions carry implementation prose
 * above them; the tag keeps that prose and the catalog text separate.
 */
export function extractDescription(method: MethodDeclaration): string {
  for (const jsDoc of method.getJsDocs()) {
    for (const tag of jsDoc.getTags()) {
      if (tag.getTagName() !== 'description') continue;

      // Collapse wrapping: the catalog is consumed one line per action.
      return (tag.getCommentText() ?? '').replace(/\s+/g, ' ').trim();
    }
  }

  return '';
}
