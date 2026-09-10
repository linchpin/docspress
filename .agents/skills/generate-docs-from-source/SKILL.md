---
name: generate-docs-from-source
description: Generate accurate DocsPress-compatible Markdown documentation from an existing source-code repository, including maintained API versions when required. Use when a project has incomplete, stale, or no documentation and an agent must derive installation, configuration, guides, API or CLI references, architecture, troubleshooting, DocsPress Gutenberg blocks, and a safe publication workflow from code and tests.
version: 1.0.0
---

# Generate Docs from Source

Build documentation from evidence in the repository, not assumptions. Produce a navigable
Markdown tree that DocsPress can convert into WordPress Pages, then hand publication setup to
`$docspress-install`.

Every claim traces to a file. Every code sample is either an excerpt with a path and a line
range, or is labelled as illustrative. Anything that could not be verified is named in the
completion report rather than quietly presented as fact.

## When to use

- A repository has no documentation, or documentation that no longer matches the code.
- A project needs an API, CLI, or configuration reference derived from source.
- A catalog repository — one repeated unit file — needs a page per unit and an index.
- A maintained older API release needs its own documented version.

**Not this skill:** publishing the result to a WordPress target — that is `$docspress-install`,
or Linchpin's `docspress-publish` wrapper for `docs.linchpin.com`. Writing one page by hand,
or editing prose in docs that are already accurate.

## Owns

Canonical for: what gets documented and why, the evidence ledger, the provenance rule for code
samples, the execution gate, quadrant planning, block selection, and the completion report.

Defers: the block catalog's exact attributes and enums → `references/block-catalog.md`, which
names the plugin source as the final authority. Publication target, workflow, and credentials →
`$docspress-install`.

## Preflight

| Look for | Tells you | If missing |
| --- | --- | --- |
| `.docspress/brief.md`, then `docs/.docspress/brief.md` | Scope, shape, required pages, non-goals, acceptance checks | Propose one from the inventory and offer to commit it |
| `docs/` with existing Markdown | What to preserve and update rather than replace | Plan a new tree in step 3 |
| `docs-versions.json` | Multiple maintained API versions are already published | Assume a single unversioned tree |
| `plugins/docspress-blocks/blocks/*/block.php` on the target | Which blocks and attribute values that revision accepts | Use `references/block-catalog.md` and say which revision you assumed |

## 1. Read the brief

Read it before inventorying anything, and treat it as this repository's contract: the audience,
the shape, the pages that must exist, the non-goals, and the acceptance checks the finished tree
has to pass.

**The brief governs scope and shape. The repository governs facts.** Never let a brief justify a
claim the source does not support; when the two disagree, document the source and report the
disagreement.

Satisfy every requirement, or name the ones you could not meet and why. When no brief exists,
propose one from what the inventory taught you and offer to commit it, so the next run starts
from the same expectations instead of rediscovering them.

Keep the brief outside the published tree. The collector globs `**/*.md` under `docs-dir` with
`dot: false`, so an ordinary Markdown file there becomes a Page while a dot-directory is skipped.

## 2. Inventory, and build the evidence ledger

1. Resolve the repository root and preserve unrelated working-tree changes.
2. Inventory with `rg --files`. Inspect package manifests, lockfiles, entrypoints, exports,
   command definitions, schemas, environment examples, tests, examples, release configuration,
   and existing docs.
3. Identify the intended audience and the supported public surface from repository evidence.
4. Determine whether the project currently supports multiple API releases. Require explicit
   evidence — maintained release branches, versioned schemas, compatibility tests, existing
   versioned docs. Package history is not a reason to publish old documentation.

Then build the **evidence ledger**, before writing any prose. One row per thing you intend to
document:

| Symbol / command / setting | Evidence | Kind | Verified by |
| --- | --- | --- | --- |
| `Module_Loader::register()` | `includes/Core/Module_Loader.php:88-104` | source | signature diffed against source |
| `wp mantle cache clear` | `includes/CLI/Cache.php:31` | source + help output | `--help` captured verbatim |
| `mantle_core_modules` | `includes/Core/Modules.php:212` | source | `apply_filters` call read |
| 404 on a disabled module | `tests/test-module-loader.php:77` | test | test read |

Where each kind of claim comes from:

- installation commands → package manifests and lockfiles;
- configuration and environment variables → schemas, defaults, and the code that reads them;
- API signatures → exported source and type declarations;
- CLI commands and flags → parser definitions and captured help output;
- behaviour and edge cases → tests;
- design rationale and rejected alternatives → `NOTE:`/`WHY:` comments, `@since`/`@deprecated`
  tags, ADRs, and `git log -S <symbol>`;
- operational steps → scripts and CI workflows;
- catalog entries → the repeated unit files themselves and their frontmatter.

Treat tests and executable examples as stronger evidence than comments. Mark contradictions for
resolution instead of choosing silently.

Close this step with a count: *"Researched N files, K public surface items, M with executable
evidence, J unverified."* A number makes under-research visible in a way prose does not.

**An item with no ledger row does not get documented. A ledger row with no page is a reported
gap.** The ledger is also where the `sourcePath` and `sourceStartLine` attributes in step 4 come
from, so it is not bookkeeping — it is the input to the pages.

Do not document private helpers as public APIs. Do not invent commands, options, URLs, support
guarantees, performance claims, or output text.

## 3. Plan the tree and the quadrants

Name the repository's shape first, because the shape decides what a complete tree means:

| Shape | Documented surface | Complete when |
| --- | --- | --- |
| Library | Exported symbols and types | Every public export appears in the reference |
| Application or service | Routes, jobs, configuration, operations | Every operator task has a runbook |
| Catalog | A repeated unit file such as `skills/*/SKILL.md` or `blocks/*/block.json` | Every unit has a page and an index row |
| Monorepo | Independently released packages | Every released package owns a section |

A catalog repository usually has no exports, commands, or tests to enumerate, so the evidence
map above finds almost nothing and the run produces one thin overview page. Enumerate the units
instead: one page per unit, plus one section index listing every unit with a link, a one-line
purpose, and its trigger. **Never shorten that list with "and others" — a missing unit is a
defect, not an editorial choice.**

Then decide which kinds of page each documented thing needs. Not everything needs all four:

| What it is | Tutorial | How-to | Reference | Explanation |
| --- | --- | --- | --- | --- |
| A feature a user interacts with | yes | yes | yes | maybe |
| A CLI command or flag | maybe | yes | yes | no |
| An internal module or architecture | no | no | yes | yes |
| A configuration option | no | yes | yes | no |
| A design decision or constraint | no | no | no | yes |
| An API endpoint | maybe | yes | yes | no |
| A multi-step workflow | yes | yes | no | maybe |

**Write reference first.** It is derived directly from the ledger and it fixes the vocabulary the
other three then use. Explanation next, then how-tos, then tutorials — hardest last, because a
tutorial consumes everything the others established.

Keep the quadrants apart. Reference states what a thing is and does not explain *why*.
Explanation gives the rationale and trade-offs and does not restate the reference — it links to
it. A how-to accomplishes one task for someone who already knows the vocabulary. A tutorial takes
a newcomer to a working result, and if they have not seen something work by the third step, the
tutorial is structured wrong.

**Explanation is the quadrant most often missing.** Trade-offs, alternatives considered, and the
reason a surprising design is the way it is are the hardest things to recover later and the
cheapest to recover now, while the `WHY:` comments and the git history are in front of you.

Preserve useful existing documentation and its voice; update stale pages in place rather than
replacing the directory. Map `docs/index.md` to the Docs root and folder `index.md` files to
section landing pages. Avoid multiple files that normalize to the same route.

Tree layouts, the page pattern, the per-quadrant templates, and the versioned-tree registry:
[`references/page-templates.md`](references/page-templates.md).

## 4. Write

Frontmatter carries the `title`; body sections start at `##`, because the theme supplies the
Page `h1`. Use relative Markdown links between pages. Use ordinary Markdown for prose, headings,
lists, links, tables, and images, and a DocsPress block where its documentation-specific
semantics apply.

### Every code sample is one of two things

**An excerpt** — lifted from the repository. It carries the path and the line range from its
ledger row, so the rendered block links to the declaration and numbers from the real first line:

````markdown
```php title="includes/Core/Bootstrap.php" lines="88-104" {91}
public function run() {
    $this->initialize_modules();
}
```
````

**Illustrative** — composed for the reader and not present in the repository. Say so, in the
caption: `caption="Follows the shape used in src/modules/*/register.js"`. A reader who copies it
should know they are copying a pattern, not a file.

A sample that is neither — a bare fence with no path and no caption, in a page that is otherwise
documenting real code — is a defect. It is the shape a reader is most likely to trust and least
able to check.

A path in an excerpt must resolve in the repository at the documented ref. Step 5 checks this.

### The rest

- Prefer a plain fence with an info string over hand-written block config. It is readable in a
  pull request and it produces the same block. Reach for the envelope only when the sample needs
  annotations, a tab set, or something no info string expresses.
- Preserve exact spelling, types, defaults, exit behaviour, and errors. Capture `--help` output
  verbatim rather than paraphrasing it.
- Keep examples minimal but runnable. Never use real credentials or production identifiers.
- Explain prerequisites before commands and verification after commands.
- Link a conceptual claim to the reference page instead of restating it.
- Use a serialized `core/image` block when an image needs Gutenberg-managed width, size, caption,
  or link behaviour; ordinary Markdown image syntax otherwise.

### Blocks

Make a page-by-page block plan before writing, and follow the brief's `## Block plan` when it has
one. If the brief has none, produce one and include it in the completion report. Report block
coverage per page.

This matters because the failure mode is silent: a run that reaches for no blocks produces plain
Markdown that looks fine in the repository and loses every affordance on the docs site. Two of
our own doc sets have zero blocks across every page.

Use every block whose semantics fit, and no block where ordinary Markdown communicates better. A
table of rules is a table. `docspress/fields` is for typed values — parameters, configuration
keys, environment variables, response properties. `docspress/symbol` is for a named thing in the
code: a function, method, class, action, filter, CLI command, endpoint, or constant.

The catalog, its attributes, its enum values, and the envelope syntax:
[`references/block-catalog.md`](references/block-catalog.md).

## 5. Verify

Run the cheapest relevant checks first and record exact results. The full ladder, with commands:
[`references/verification.md`](references/verification.md).

1. Every generated page is nonempty and has a unique route and title.
2. Every relative link and local image path resolves from the file containing it.
3. Every `sourcePath` and excerpt `title=` resolves to a real file at the documented ref, and
   every line range is inside that file.
4. Every documented signature, flag, default, and environment variable matches its ledger row.
5. `--help` output is captured, not paraphrased.
6. **Every runnable sample runs, or is marked unverified** — in the page's caption as well as the
   completion report. An unrun example presented as verified is the one failure this skill exists
   to prevent.
7. No placeholders survive: `TODO`, `TBD`, `YOUR_*`, fake domains, unverified version numbers.
   Deliberate placeholders stay only inside clearly labelled templates.
8. Every `wp:docspress/*` and `docspress:block` payload parses, and its block name, attributes,
   and enum values are valid for the target plugin revision.
9. Representative Markdown round-trips through the pinned converter. **Parse both sides and
   compare the attribute objects** — DocsPress normalizes HTML-sensitive characters to Unicode
   escapes, so a byte comparison reports differences that are not defects.
10. For a version registry, run the pinned collector and verify source ownership, safe paths,
    unique logical routes, latest ownership, per-version redirects, and version-aware links.
11. Run the repository's own formatter, lint, typecheck, tests, and build in proportion to the
    change. Inspect scripts and dependency lifecycle hooks before executing them.
12. `git diff --check`, then scan the docs diff for credential-shaped strings. Generated
    configuration examples are where secrets leak: an invented key that looks real is a support
    problem, and a real one copied out of a `.env` read during step 2 is an incident.
13. If a check cannot run, state why and narrow the claim.

When a brief exists, run its acceptance checks last and report each as met or unmet with the
number or name it produced. An unmet brief requirement is a reported gap, never a silent
omission.

Do not weaken tests or alter product behaviour to make a documentation example pass. If source
behaviour is broken or ambiguous, report it separately.

## 6. Configure publication when missing

Search `.github/workflows/` for an existing DocsPress action. If none exists, invoke
`$docspress-install` and let it own the workflow, the credentials, and the promotion ladder.
Documentation generation must still complete when WordPress credentials are unavailable — leave
the workflow ready and report the exact authentication step the user must perform.

## Guardrails

- **Never present an unrun example as verified.** Mark it on the page, not only in the report.
- **Never invent** a command, option, URL, output string, support guarantee, or performance claim.
  Absence of evidence is a gap to report, not a blank to fill.
- **Never document a private helper as public API.**
- **Never shorten a catalog with "and others."**
- **Never edit product source, tests, or behaviour** to make documentation true. Report the
  mismatch instead.
- **Never commit a credential.** Fake every secret in an example, and scan the diff before
  finishing.
- **Never bump a pinned revision** — `upstream.json`, an action SHA, a plugin version — as a side
  effect of generating documentation.
- Do not push, dispatch a workflow, add secrets, install or activate a plugin or theme, or write
  WordPress Pages without separate authorization.

## Done

- [ ] The brief was read, and every acceptance check is reported as met or unmet.
- [ ] An evidence ledger exists, with a closing count, and nothing is documented without a row.
- [ ] Every code excerpt carries a path and line range that resolves; every illustrative sample
      says it is illustrative.
- [ ] Every runnable sample was run, or is marked unverified on the page.
- [ ] A block plan exists and block coverage is reported per page.
- [ ] Links, routes, block payloads, and the converter round-trip all check out.
- [ ] Lint, tests, and build pass, and the docs diff carries no credentials and no source changes.
- [ ] The completion report names every unverified claim and every source contradiction.

## Completion report

Report:

- pages created, updated, and intentionally preserved;
- the ledger counts, and any row that produced no page;
- each acceptance check from the brief, with its result;
- source files used as evidence;
- code samples and commands actually executed, and those marked unverified;
- blocks used, their locations, payload validation, and the plugin revision assumed;
- version registry, source layouts, latest ownership, and intentionally missing counterparts;
- lint, test, build, link, and workflow validation results;
- any unverified claims, source contradictions, or decisions the user needs to make.
