# Adding a data-testid in admin-ff

Load this only when the inventory found a control the test must click, fill, or uniquely assert, and admin-ff has **no** testid on it and **no** stable parent testid that identifies it.

**REQUIRED:** read `admin-ff/.claude/docs/data-testid-guidelines.md` in the resolved admin-ff repo. Follow that file. Do not restate it here.

## Should-have bar

Write a testid only if all of these hold:

- The test interacts with the node (click / fill / check / uniquely assert visible).
- It is an interactive or landmark control (button, input, tab, menu item, row, modal, toast, switch), not a layout wrapper.
- No existing testid on the node or a stable ancestor uniquely identifies it.

Otherwise interrogate (temporary role/text locator with `// TODO: Add data-testid in the UI and migrate this selector` vs skip).

## How to write it

1. Put the value in the feature's `constants/dataTestIds.ts` (or `constants/test-ids/…`). Do not hardcode a new string in JSX.
2. Pattern: `{scope}-{element-type}-{action/purpose}`, kebab-case. Use `slugifyForDataTestIdSegment` for dynamic segments.
3. Bind `data-testid={CONST}` on the component the test will target.
4. Leave the admin-ff change **uncommitted**. Put the diff (files + new ids) in the report so the user can open an admin-ff PR.
5. Update the e2e definition site to the new value.
6. If `ADMIN_URL` is remote, stop and interrogate before running; the new attribute is not on the deployed admin.

## Out of scope

- Restyle, refactor, or migrate the admin-ff view to the design system.
- Rename unrelated testids "for consistency".
- Commit, push, or open the admin-ff PR unless the user asks in a later turn.
