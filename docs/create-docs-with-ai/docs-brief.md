---
title: Write a documentation brief
sidebar_position: 15
---

A brief tells the generator what "finished" means for one repository, so the same skill produces a reference for a library, a runbook for a service, and a complete catalog for a repository of repeated units.

## Where the brief lives

Commit it at `.docspress/brief.md` in the repository root. `$generate-docs-from-source` reads it before inventorying anything else.

<!-- docspress:block
{
  "version": 1,
  "name": "docspress/callout",
  "attrs": {
    "tone": "warning",
    "title": "Keep the brief out of the published tree",
    "content": "\u003cp\u003eDocsPress collects every \u003ccode\u003e.md\u003c/code\u003e file below \u003ccode\u003edocs-dir\u003c/code\u003e and turns it into a Page. A brief stored at \u003ccode\u003edocs/DOCS-BRIEF.md\u003c/code\u003e would publish itself. Dot-directories are skipped, so \u003ccode\u003e.docspress/brief.md\u003c/code\u003e and \u003ccode\u003edocs/.docspress/brief.md\u003c/code\u003e are both safe.\u003c/p\u003e",
    "collapsible": false
  }
}
-->
> [!WARNING]
>
> **Keep the brief out of the published tree**
>
> DocsPress collects every `.md` file below `docs-dir` and turns it into a Page. A brief stored at `docs/DOCS-BRIEF.md` would publish itself. Dot-directories are skipped, so `.docspress/brief.md` and `docs/.docspress/brief.md` are both safe.
<!-- /docspress:block -->

## What a brief contains

Every section is prose. There is no schema to satisfy — the generator reads it the way a new writer would.

<!-- docspress:block
{
  "version": 1,
  "name": "docspress/fields",
  "attrs": {
    "title": "Brief sections",
    "description": "Order does not matter. Shape, required pages, and acceptance checks do the most work.",
    "fields": [
      {
        "name": "Shape",
        "type": "enum",
        "required": true,
        "defaultValue": "",
        "description": "What the repository is, which decides what a complete tree means.",
        "values": "library, application, catalog, monorepo",
        "deprecated": false
      },
      {
        "name": "Audience",
        "type": "string",
        "required": true,
        "defaultValue": "",
        "description": "Who reads these docs, what they already know, and what they must not be told twice.",
        "values": "",
        "deprecated": false
      },
      {
        "name": "Collection",
        "type": "object",
        "required": false,
        "defaultValue": "",
        "description": "For a catalog: the source glob, the destination path, and which part of each unit file becomes which part of the page.",
        "values": "",
        "deprecated": false
      },
      {
        "name": "Required pages",
        "type": "array",
        "required": true,
        "defaultValue": "",
        "description": "Pages that must exist, each with the one thing it must contain.",
        "values": "",
        "deprecated": false
      },
      {
        "name": "Non-goals",
        "type": "array",
        "required": false,
        "defaultValue": "",
        "description": "Material to leave out, so the tree does not grow pages nobody asked for.",
        "values": "",
        "deprecated": false
      },
      {
        "name": "Acceptance checks",
        "type": "array",
        "required": true,
        "defaultValue": "",
        "description": "Countable assertions the finished tree has to pass. The generator reports each one as met or unmet.",
        "values": "",
        "deprecated": false
      },
      {
        "name": "Voice",
        "type": "string",
        "required": false,
        "defaultValue": "",
        "description": "House tone, vocabulary, and the words to avoid.",
        "values": "",
        "deprecated": false
      }
    ],
    "searchable": false,
    "compact": false
  }
}
-->
#### Brief sections

Order does not matter. Shape, required pages, and acceptance checks do the most work.

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `Shape` | enum | Yes |  | What the repository is, which decides what a complete tree means. |
| `Audience` | string | Yes |  | Who reads these docs, what they already know, and what they must not be told twice. |
| `Collection` | object | No |  | For a catalog: the source glob, the destination path, and which part of each unit file becomes which part of the page. |
| `Required pages` | array | Yes |  | Pages that must exist, each with the one thing it must contain. |
| `Non-goals` | array | No |  | Material to leave out, so the tree does not grow pages nobody asked for. |
| `Acceptance checks` | array | Yes |  | Countable assertions the finished tree has to pass. The generator reports each one as met or unmet. |
| `Voice` | string | No |  | House tone, vocabulary, and the words to avoid. |
<!-- /docspress:block -->

## Write acceptance checks you can count

A brief that says "cover every skill" is a wish. A brief that says "pages under `docs/skills/` equals the count of `skills/*/SKILL.md`" is a check the verification pass runs and the completion report answers. Prefer counts, equalities, and "every X has a Y" over adjectives.

## Name the repository shape

The shape decides which evidence matters and what completeness means.

| Shape | Documented surface | Complete when |
| --- | --- | --- |
| Library | Exported symbols and types | Every public export appears in the reference |
| Application or service | Routes, jobs, configuration, operations | Every operator task has a runbook |
| Catalog | A repeated unit file such as `skills/*/SKILL.md` or `blocks/*/block.json` | Every unit has a page and an index row |
| Monorepo | Independently released packages | Every released package owns a section |

Catalog repositories are the ones that most often come back thin. They have no exports, commands, or tests to enumerate, so an evidence-first pass finds little to say and writes a single overview. The brief is what turns them into one page per unit plus an index that lists all of them.

## A complete example

<!-- docspress:block
{
  "version": 1,
  "name": "docspress/colorful-code",
  "attrs": {
    "language": "markdown",
    "filename": ".docspress/brief.md",
    "code": "\u002d\u002d-\ntitle: Documentation brief\n\u002d\u002d-\n\n## Shape\n\nCatalog. The documented surface is the set of skills, not the installer that copies them.\n\n## Audience\n\nLinchpin engineers choosing which skill to invoke, and clients evaluating how we work.\nAssume Claude Code familiarity. Explain what a skill is once, on the docs root.\n\n## Collection\n\n- Source glob: `skills/*/SKILL.md`\n- One page per match at `docs/skills/\u003cdirectory-name\u003e.md`\n- Take the title from frontmatter `name` and the summary from frontmatter `description`\n- Take the triggers from `## When to use`, the limits from `## Guardrails`, and the\n  self-check from `## Done`\n- Quote the **Not this skill:** boundary verbatim; it is how readers pick between siblings\n\n## Required pages\n\n- `docs/index.md` — what the library is, how to install it, how to propose a skill\n- `docs/skills/index.md` — a table of every skill: linked name, one-line purpose, when to\n  reach for it, and the sibling it defers to. Alphabetical. No skill omitted.\n- `docs/contributing.md` — the house standard, derived from `write-a-linchpin-skill`\n\n## Non-goals\n\n- No page for the installer internals, CI, or release tooling\n- No API reference; there is no public API\n- No per-skill changelog; `CHANGELOG.md` covers the package\n\n## Acceptance checks\n\n- Pages under `docs/skills/` equals the count of `skills/*/SKILL.md`\n- Rows in the `docs/skills/index.md` table equals that same count\n- Every row links to a page that exists, and every page is linked from a row\n- Every page names at least one trigger and one guardrail from its own SKILL.md",
    "highlightedLines": "",
    "showLineNumbers": false,
    "caption": "A brief for a catalog repository of agent skills.",
    "diffMode": "none",
    "copyMode": "all",
    "annotations": []
  }
}
-->
**.docspress/brief.md — A brief for a catalog repository of agent skills.**

```markdown
---
title: Documentation brief
---

## Shape

Catalog. The documented surface is the set of skills, not the installer that copies them.

## Audience

Linchpin engineers choosing which skill to invoke, and clients evaluating how we work.
Assume Claude Code familiarity. Explain what a skill is once, on the docs root.

## Collection

- Source glob: `skills/*/SKILL.md`
- One page per match at `docs/skills/<directory-name>.md`
- Take the title from frontmatter `name` and the summary from frontmatter `description`
- Take the triggers from `## When to use`, the limits from `## Guardrails`, and the
  self-check from `## Done`
- Quote the **Not this skill:** boundary verbatim; it is how readers pick between siblings

## Required pages

- `docs/index.md` — what the library is, how to install it, how to propose a skill
- `docs/skills/index.md` — a table of every skill: linked name, one-line purpose, when to
  reach for it, and the sibling it defers to. Alphabetical. No skill omitted.
- `docs/contributing.md` — the house standard, derived from `write-a-linchpin-skill`

## Non-goals

- No page for the installer internals, CI, or release tooling
- No API reference; there is no public API
- No per-skill changelog; `CHANGELOG.md` covers the package

## Acceptance checks

- Pages under `docs/skills/` equals the count of `skills/*/SKILL.md`
- Rows in the `docs/skills/index.md` table equals that same count
- Every row links to a page that exists, and every page is linked from a row
- Every page names at least one trigger and one guardrail from its own SKILL.md
```
<!-- /docspress:block -->

## Seed the shape you want

The generator preserves useful existing documentation and updates pages in place, so a committed stub steers it harder than any sentence in a brief. Commit `docs/skills/index.md` with its frontmatter, a one-line introduction, and an empty table carrying the exact column headers. The first run fills the rows; every later run keeps the shape.

## Ask for the brief pass explicitly

<!-- docspress:block
{
  "version": 1,
  "name": "docspress/prompt",
  "attrs": {
    "prompt": "Use $generate-docs-from-source. Read .docspress/brief.md first and treat it as the contract for this repository. Show me the proposed tree and the acceptance checks you plan to run before you write any pages.",
    "model": "Coding agent",
    "mode": "plan",
    "thinking": true,
    "context": "$generate-docs-from-source, @repository, .docspress/brief.md, docs/",
    "caption": "The brief sets scope; the repository still sets facts."
  }
}
-->
#### The brief sets scope; the repository still sets facts.

> Use $generate-docs-from-source. Read .docspress/brief.md first and treat it as the contract for this repository. Show me the proposed tree and the acceptance checks you plan to run before you write any pages.

_Model: Coding agent · Mode: plan · Thinking: on · Context: $generate-docs-from-source, @repository, .docspress/brief.md, docs/_
<!-- /docspress:block -->

## When no brief exists

The generator proposes one from what it learned during the inventory and offers to commit it. Reviewing that draft is cheaper than reviewing a finished tree that documented the wrong things, and it makes the next run repeatable.

<!-- docspress:block
{
  "version": 1,
  "name": "docspress/result",
  "attrs": {
    "status": "success",
    "title": "One reviewable file per repository",
    "content": "\u003cp\u003eExpectations live in the repository, travel with it, and are checked on every run instead of being retyped into a prompt.\u003c/p\u003e",
    "meta": "brief → tree → acceptance checks → report"
  }
}
-->
> [!TIP]
>
> **One reviewable file per repository**
>
> Expectations live in the repository, travel with it, and are checked on every run instead of being retyped into a prompt.
>
> _brief → tree → acceptance checks → report_
<!-- /docspress:block -->

Continue with [Review and publish](review-and-publish.md).
