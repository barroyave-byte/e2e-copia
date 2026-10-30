# Testid inventory and mapping

Load this before editing locators. Do this **once for the whole spec set**, then apply remaps, then run.

## Extract IDs the specs actually use

1. Open each given spec. Record imported admin POMs (`playwright/pages/admin/**`) and admin DSL plugins (`playwright/framework/plugins/admin/**`).
2. From those files (not from the spec), collect:
   - `getByTestId('…')` / `getByTestId("…")` / ``getByTestId(`…`)``
   - `[data-testid=…]` / `[data-testid^=…]`
   - Values of local `DATA_TEST_IDS` / `*_TEST_IDS` objects used by those locators
3. Ignore checkout/vault/payment locators. This inventory is admin UI only.
4. Keep the **definition path + line** with each string. That is the only place a remap may be written.

## Cross against admin-ff

Search the resolved admin-ff repo, not e2e-testing.

Prefer feature constants over raw JSX:

- `src/**/constants/dataTestIds.ts`
- `src/**/constants/test-ids/**`
- symbols `*_TEST_IDS`, `DATA_TEST_IDS`, `DATA_TEST_ID_SCOPE`

Then search JSX/`data-testid=` only if the constant files do not decide it.

**Same feature** means the admin-ff view/component that implements the screen the POM is exercising (e.g. Reports POM → `src/components/views/Reports/**`), not a fuzzy match across the whole admin-ff tree.

## Confidence

| Result in the same feature                                                                                                                 | Action                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Exact string still present                                                                                                                 | No remap                                                            |
| Constant **key** unchanged, **value** changed, single candidate                                                                            | Auto-remap the definition site to the new value                     |
| Dead string, exactly one obvious sibling (same scope prefix + same element type, or the only remaining control of that role on the screen) | Auto-remap                                                          |
| Dead string, 0 candidates                                                                                                                  | Treat as missing testid → `references/admin-ff-testid.md`           |
| Dead string, ≥2 candidates                                                                                                                 | Interrogate. Show each candidate with file + JSX snippet + constant |

Do not grep-best-match across unrelated features (`orders-button-save` must not snap to a reports toast).

## After remaps

- Do not duplicate the new string into the spec.
- If the spec is already DSL, keep calling the same action; the POM under it carries the new id.
- If `--siblings` is off, still list importers of the changed POM/plugin in the report blast radius. Do not re-run them.
