# PR Reviewer Agent

Automated first-pass code review for the E2E suite. Runs on every pull request,
audits the added lines against the testing standard, and posts its findings as
inline comments.

> **When you add or change a rule, update the rules table in
> [`AGENTS.md`](../../AGENTS.md) in the same pull request.**
>
> That table is what every AI assistant reads before writing or fixing a test in
> this repository, so it is how a rule prevents violations instead of only
> catching them. If it falls behind `rules.ts`, assistants generate code the
> agent then blocks — the two contradict each other and the author cannot tell
> which one to trust.
>
> `rules.ts` is owned by QA; treat the table as part of the same change.

## Adding a rule with Claude Code

The fastest path is to hand this document to Claude Code together with the rule
you want. Paste the prompt below, replacing the bracketed parts:

```text
Read scripts/pr-review-agent/README.md, then add a rule to the PR Reviewer Agent.

Rule: [what it should detect, in one sentence]
Example of the violation:
  [paste a snippet of the code that should be reported]
Example that must NOT be reported:
  [paste a snippet that looks similar but is correct, if you know of one]
Intended severity: [error | warning | info]

Follow the README, and in this order:
1. Measure the baseline: how many occurrences already exist in the repo. Tell me
   the number before writing anything, because it decides whether the severity is
   viable.
2. Write the rule in the file the README indicates for its scope, and register it
   in RULES.
3. Prove it fires with a fixture that violates it on purpose.
4. Run the false-positive sweep over the last 40 merged commits.
5. Show me every hit with its file and line so I can tell you which ones are real
   defects and which are false positives. Do not decide that yourself.
6. Add the exemptions I confirm, and repeat steps 3 to 5.

Report findings in Spanish, everything else in English. Do not commit.
```

Step 1 is the one that is easy to skip and most worth keeping: measuring
`waitForTimeout` at 209 pre-existing occurrences is what showed that rule could
not start as `error` without a scope restriction. Step 5 needs a human — whether a
hit is a real defect is a judgement about the test suite, not about the code.

## How a run works

Three passes over the **added lines** of the diff:

| Pass                | Engine                            | Max severity | Blocks the pull request |
| ------------------- | --------------------------------- | ------------ | ----------------------- |
| Deterministic rules | `ts-morph` AST + regex            | `error`      | Yes                     |
| Zephyr title check  | Zephyr Scale API                  | `warning`    | No                      |
| Advisory review     | OpenAI, falling back to Anthropic | `info`       | No                      |

Only deterministic rules can block. A rule that fails a pull request must give
the same answer every time, which an LLM cannot guarantee.

## Two design constraints to know before adding a rule

**Only added lines are reportable.** The suite carries a large amount of
pre-existing violations. A rule that audits whole files fails almost any pull
request touching an older test, regardless of what it changed. Always filter with
`isNew(file, line)`.

**Rules are framework-aware.** Two frameworks coexist during the DSL migration:

- **DSL** — the spec imports `TestingFramework`; locators live in
  `playwright/framework/plugins/**` and the test orchestrates action steps.
- **Legacy / POM** — the spec imports Page Objects from `@pages/*`; locators live
  in the Page Class `constructor`.

`file.framework` tells you which one applies. Judge each file against the standard
of its own framework; never require an existing legacy spec to be converted.

## Where rules live

| File              | Holds                                                                              |
| ----------------- | ---------------------------------------------------------------------------------- |
| `rules.ts`        | Core rules: IDs, tags, locator placement, waits, credentials, order token, hygiene |
| `rules.review.ts` | Assertions and repository conventions                                              |
| `rules.repo.ts`   | Rules needing repository-wide context (they run `git grep` or read repo files)     |
| `zephyr.ts`       | The Zephyr title comparison (async, network-bound)                                 |
| `llm.ts`          | Advisory pass: prompt, provider chain, response parsing                            |
| `types.ts`        | `Rule`, `Finding`, severities, path and framework helpers                          |
| `diff.ts`         | Changed files and their added lines                                                |
| `report.ts`       | Markdown for inline comments and the summary                                       |
| `github.ts`       | Publishing, comment upsert, collapsing stale comments                              |
| `index.ts`        | Orchestration and exit code                                                        |

Put a new rule in `rules.ts` unless it needs `git grep` or a network call, in
which case use `rules.repo.ts` or a module of its own.

## Adding a rule

A rule is a pure function over one file. Declare it, then register it in the
`RULES` array at the bottom of `rules.ts`.

```ts
/**
 * Detects <what>, which causes <consequence>.
 *
 * <Any exemption, and the technical reason for it.>
 */
const ruleNoFooBar: Rule = {
  id: 'no-foo-bar',
  severity: 'error',
  docs: DOCS.flaky,
  // Optional: restrict to one framework. Omit to run against all of them.
  frameworks: ['dsl'],
  appliesTo: (f) => isSpec(f.path),
  run: (file) => {
    const findings: Finding[] = [];
    const sf = parse(file);

    for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      const line = lineOf(call);
      if (!isNew(file, line)) continue;
      if (calleeName(call) !== 'fooBar') continue;

      findings.push({
        ruleId: 'no-foo-bar',
        severity: 'error',
        file: file.path,
        line,
        title: 'Short statement of the defect',
        message: 'What is wrong and how to fix it.',
        docs: DOCS.flaky,
        source: 'ast',
      });
    }

    return findings;
  },
};
```

Then:

```ts
export const RULES: Rule[] = [
  // ...
  ruleNoFooBar,
];
```

### Choosing a severity

| Severity  | Use for                                                         |
| --------- | --------------------------------------------------------------- |
| `error`   | An objective defect with a single correct fix. Blocks the merge |
| `warning` | A real problem where context may justify it                     |
| `info`    | A suggestion the author may reasonably ignore                   |

Only assign `error` to a rule that is deterministic and that survives the
false-positive sweep below with zero hits.

### Writing the message

The finding text is published on the pull request and is written in **Spanish**,
so it matches the rest of the comment. Everything else — code, comments, logs —
is in English.

State the defect, its consequence, and the fix. Set `suggestion` only when the
replacement is valid, complete code for that line; a suggestion that does not
compile teaches the team to ignore the button. An empty string renders as a
one-click deletion of the line.

## Mandatory: verifying a rule

A rule can be the right idea and still be implemented wrongly. These two checks
catch that, and both are required before a rule is merged.

### Prove the rule fires

Write a fixture that violates the rule on purpose and confirm it is reported. A
rule registered in `RULES` that silently matches nothing reads exactly like a
clean result, so without this check a dead rule can ship unnoticed.

### Run the false-positive sweep

Merged commits are code the team already accepted. Anything the rule reports
there is either a real defect that slipped through or a false positive in the
detection logic — inspect each hit to tell them apart.

```bash
for sha in $(git log --format=%H -40 --no-merges -- 'playwright/**/*.ts'); do
  npm run pr-review -- --base ${sha}~1 --head ${sha} --dry-run --no-llm 2>/dev/null \
    | grep -E "^(🛑|⚠️|💡)"
done | sed -E 's/^(..).*\[([a-z/-]+)\].*/\1 \2/' | sort | uniq -c | sort -rn
```

A new `error` rule must come out of this with **zero** findings, or the findings
must be verified one by one as genuine defects. When a hit is not a defect, add a
scoped exemption and document the technical reason in the rule's comment.

Every rule currently in the agent needed an exemption that only surfaced by
running this. A few examples: retry backoff in `playwright/support/**` is not a
static wait; a `// migration-or` marker means the duplication is deliberate; the
DSL asserts through `action: '...assertX'` strings rather than `expect`; a `catch`
around `JSON.parse` is control flow, not a suppressed failure. None of these can
be derived from the rule's description.

## Running locally

```bash
# Current branch against develop, publishing nothing
npm run pr-review:local

# Deterministic pass only, no API calls
npm run pr-review -- --base origin/develop --head HEAD --dry-run --no-llm

# Uncommitted changes (staged, unstaged and untracked) against HEAD
npm run pr-review -- --worktree --no-llm

# The same, as one JSON document on stdout for a program to act on
npm run pr-review -- --worktree --no-llm --json

# A specific range
npm run pr-review -- --base <sha> --head <sha> --dry-run
```

| Flag                | Effect                                                                                                                                         |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `--base` / `--head` | Diff endpoints. Defaults to `origin/develop`..`HEAD`                                                                                           |
| `--worktree`        | Reviews the working tree instead of `--head`: staged, unstaged and untracked (not ignored) files. `--base` defaults to `HEAD`. Never publishes |
| `--json`            | Prints one JSON document on stdout and every log line on stderr. Exit code unchanged                                                           |
| `--dry-run`         | Prints the summary, publishes nothing                                                                                                          |
| `--no-llm`          | Skips the advisory pass                                                                                                                        |

### Reviewing before committing: `--worktree` and `--json`

`--worktree` exists for whoever wants the reviewer's verdict before there is a
commit: an author, an AI assistant following `AGENTS.md`, or qa-testgen's codegen
agent, which must leave its changes uncommitted for its orchestrator. It reads the
repository and writes nothing — not the index, not a ref — so it is safe to run in
the middle of someone's work. An untracked file counts as added, every line of it.

`--json` is the contract for a program acting on the findings instead of a person
reading them. The document (`renderJson()` in `report.ts`):

```jsonc
{
  "schema": 1, // bumped on any breaking change, never for an added field
  "base": "HEAD",
  "head": null, // a commit, or null for --worktree
  "blocking": true, // same rule as the exit code
  "counts": { "error": 7, "warning": 0, "info": 0 },
  "files": [{ "path": "…", "framework": "dsl", "status": "added", "addedLines": 91 }],
  "passes": { "zephyr": "skipped", "llm": "off" },
  "findings": [
    {
      "ruleId": "…",
      "severity": "error",
      "file": "…",
      "line": 38,
      "title": "…",
      "message": "…",
      "source": "ast",
      "fingerprint": "…",
      "threadKey": "…",
    },
  ],
}
```

`title` and `message` are the Spanish text that would be published; `fingerprint`
and `threadKey` are the same identities the pull request comments carry, so a
finding seen before the commit is recognisably the one CI reports after it. An
agent crash still exits 0 — under `--json` it prints nothing on stdout, which a
consumer must read as "review unavailable", never as "no findings".

`npm run pr-review:check-worktree` verifies both against a throwaway repository.
Run it after touching `diff.ts`, `index.ts` or `renderJson()`.

`npm run pr-review:check-team-tag` verifies `team-tag-required` the same way. That rule reads
its valid tags from `.github/workflows/team-tag-validation.yml`, so it fires before the PR
exists, not only in CI. It mirrors only the workflow's team-tag half. The `@preprod`/`@smoke`
half is a gate only the QA team passes, and passes on purpose, so as a reviewer error it
would block QA's own PRs.

## Configuration

| Variable                         | Default           | Purpose                                                                                                                                                                                                                                                                                                                           |
| -------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GITHUB_TOKEN`                   | —                 | Publishing and thread reconciliation. **Not** the default Actions token: its `viewerCanResolve` is `false` on every review thread, so `reconcileThreads()` can post and silence findings but can never auto-resolve a fixed one. The workflow sources this from `secrets.DUNA_ACTION_TOKEN` instead, which does have write access |
| `OPENAI_API_KEY`                 | —                 | Advisory pass, tried first                                                                                                                                                                                                                                                                                                        |
| `ANTHROPIC_API_KEY`              | —                 | Advisory pass fallback                                                                                                                                                                                                                                                                                                            |
| `ZEPHYR_ACCESS_TOKEN`            | —                 | Title comparison. Skipped when absent or expired                                                                                                                                                                                                                                                                                  |
| `PR_AGENT_LLM_PROVIDER`          | unset             | Pin `openai` or `anthropic` instead of the chain                                                                                                                                                                                                                                                                                  |
| `PR_AGENT_OPENAI_MODEL`          | `gpt-5.6-luna`    | Inherits `OPENAI_MODEL_CLASSIFY` when set                                                                                                                                                                                                                                                                                         |
| `PR_AGENT_ANTHROPIC_MODEL`       | `claude-sonnet-5` | Fallback provider model                                                                                                                                                                                                                                                                                                           |
| `PR_AGENT_LLM_MAX_FILES`         | `12`              | Files sent to the advisory pass                                                                                                                                                                                                                                                                                                   |
| `PR_AGENT_LLM_MAX_FINDINGS`      | unlimited         | Optional cap on advisory findings                                                                                                                                                                                                                                                                                                 |
| `PR_AGENT_NEW_SPECS_REQUIRE_DSL` | `warning`         | `error` \| `warning` \| `off`                                                                                                                                                                                                                                                                                                     |

Every network-bound pass degrades to "skipped" rather than failing the run: a
missing key, an expired token or an API outage never blocks a pull request.

## False positives

Each comment names the rule that produced it. If a rule is wrong, open a pull
request against the rule with the case that broke it — do not disable the
workflow. An `error` the team learns to ignore is worse than no agent at all.

Narrowing a rule follows the same verification as adding one: the sweep must
show that only the target rule's count moved. Two exemptions came out of that
process and are worth knowing about, because both look like violations:

- **`locators-in-constructor`** ignores `this.frame.locator(this.input)`. The
  call composes two locators the constructor already declares, which is how
  Playwright reaches inside an iframe; there is no new selector to move out.
  Recognised by the argument being a `this.*` property, since `noResolve: true`
  leaves no type information to tell `locator(aLocator)` from `locator(sel)`.
- **`shared-method-impact`** ignores a declaration whose canonical token
  sequence is unchanged. Reformatting adds lines without changing what the method
  does, and asking the author to attach execution evidence for a no-op is pure
  friction — it already cost one reviewer two manual replies saying "the linter
  only changed the indentation". Comparing tokens rather than text covers
  everything a formatter controls: indentation, line wrapping, comments and
  JSDoc, optional semicolons, trailing commas, and quote style. Anything that
  carries meaning survives, so a changed number, a reordered argument or a
  dropped `await` is still reported. The base version comes from
  `ChangedFile.baseContent`, the file as it stood at the base commit.
- **`no-hardcoded-secrets`** ignores a URL that initialises a payload field
  (`merchant_url`, `image_url`, `redirect_url`, …). It is the value the API
  expects to receive, not an environment the test navigates to, so `envConfig`
  is the wrong home for it. The rule still reports `page.goto` targets and any
  `baseURL` written into the code.

## Comment threads

**A finding keeps one thread for the life of the pull request.** The agent
reconciles against what is already on the pull request instead of deleting its
comments and posting them all again.

The approach this replaced destroyed the reviewer's work: a thread that someone
answered and resolved was deleted and recreated from scratch on the next push,
arriving as a brand new, unresolved comment with the conversation gone. The same
finding therefore had to be reviewed again on every push, and three runs on one
pull request left 149 comments for 29 real findings.

`reconcileThreads()` applies this table on every run:

| Thread on the pull request         | Finding still reported | Action                                                       |
| ---------------------------------- | ---------------------- | ------------------------------------------------------------ |
| none                               | yes                    | post a new comment                                           |
| open                               | yes                    | leave it alone                                               |
| resolved                           | yes                    | leave it alone, list it as silenced                          |
| outdated, line's content changed   | yes                    | post again — the live one is buried and the wording is stale |
| outdated, line's content unchanged | yes                    | leave it alone                                               |
| open                               | no                     | resolve it                                                   |

Leaving an open thread alone is enough: GitHub re-anchors a comment forward to
the newest commit where it still applies, and collapses it as outdated when the
line is gone. A fixed finding is resolved **silently** — one reply per fixed
finding is one notification per finding, which is the noise this removes. The
summary comment carries the counts.

**`outdated` does not mean the finding's own line changed.** Confirmed on
sandbox PR #3612: GitHub marks every open thread outdated on any push that
advances the pull request's base branch (another PR merging into it while this
one is open — routine on a busy repo), and on any push editing the same file
anywhere near the finding, whether or not the finding's own line changed.
Reposting on every one of those would recreate the exact pile-up this
reconciliation exists to remove, just spread across ordinary pushes instead of
compressed into one delete-and-repost cycle. `fingerprint()` is what tells a
real edit from GitHub losing track of the position: it hashes the exact
reported line, so it only changes when the line's own text does. An outdated
thread whose stored fingerprint still matches is left alone, even collapsed —
the check still blocks on `findings`, not on what a human can currently see.
Re-validated on a clean sandbox PR (#3615): an unrelated push that only
advances the base branch produces zero new comments for an untouched finding.

**Resolving a thread silences the comment; it does not lift the check.** The
blocking decision is read from the findings, never from the threads, so a
resolved conversation cannot wave a violation through. That is why silenced
findings are listed in the summary: a blocking finding nobody can see is exactly
what makes a red check look like an agent malfunction.

Both identities live in `identity.ts`. Thread identity is `threadKey()`,
deliberately _looser_ than `fingerprint()`: it erases string and numeric
literals, so changing `waitForTimeout(3000)` to `waitForTimeout(5000)` keeps the
reviewer's conversation instead of closing it and opening a new one. The exact
`fingerprint()` still changes, which is the honest answer to whether that edit
fixed anything: it did not.

`npm run pr-review:check` exercises the whole table against a stubbed Octokit.
Run it after touching `github.ts`.

### Migration

Comments published before markers existed cannot be matched to a finding, so they
are cleared the old way — deleted, or collapsed when they carry replies. Remove
that branch of `reconcileThreads()` once no open pull request predates the
change.
