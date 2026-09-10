# Page templates and tree layouts

Shapes for the tree, the page, and each Diátaxis quadrant. Fill them from the evidence ledger,
not from memory.

## Tree layouts

Scale the tree to the project. A typical application or library:

```text
docs/
  index.md
  getting-started/
    index.md
    installation.md
    configuration.md
  guides/
    index.md
    first-real-workflow.md
  reference/
    index.md
    api.md
    cli.md
  explanation/
    index.md
    architecture.md
  troubleshooting.md
```

A catalog repository is flatter — one section directory holding a page per unit beside its
index:

```text
docs/
  index.md
  skills/
    index.md
    project-context.md
    quality-gates.md
  contributing.md
```

Create only pages the source supports. A small library may need only an overview, installation,
usage, and an API reference. Map `docs/index.md` to the Docs root and folder `index.md` files to
section landing pages. Avoid two files that normalize to the same route.

## The page

```markdown
---
title: Clear page title
---

One short paragraph stating what a reader gets from this page.

## First section

Verified instructions and examples.
```

Frontmatter carries the title; the theme supplies the `h1`. Body sections start at `##`.

## Reference

Information-oriented. Complete, accurate, and boring. Derived directly from the ledger.

```markdown
---
title: Hooks
---

Every action and filter Mantle fires, read from the `do_action()` and `apply_filters()` calls
in source.

## Actions

<!-- one docspress/symbol per hook, kind: hook -->

## Filters

<!-- one docspress/symbol per filter, kind: filter -->
```

Rules:

- **Every public item in the ledger appears here.** Completeness is the whole value of a
  reference; a partial one is worse than none, because a reader cannot tell what is missing.
- Give types, defaults, and constraints. "Accepts a string" is not reference-grade. "Accepts a
  string of at most 256 characters matching `^[a-z-]+$`" is — and you can only write the second
  by reading the validator.
- Preserve exact spelling, including case and underscores.
- Do not explain *why*. That is the explanation page, and it links here.

## Explanation

Understanding-oriented. The quadrant most often missing, and the one only someone reading the
source right now can write.

```markdown
---
title: Why modules initialise before controllers
---

One paragraph stating the problem this design solves, in terms someone who has not read the
code would follow.

## The problem

What goes wrong without it. Real failure modes, not abstract risk.

## The approach

How the design addresses it.

## Trade-offs

What was given up. Every design decision trades something; name it.

## Alternatives considered

What was tried or rejected, and why — from `NOTE:`/`WHY:` comments, ADRs, or
`git log -S <symbol>`.
```

Do not restate the reference. Link to it.

## How-to

Task-oriented, for a reader who already knows the vocabulary.

```markdown
---
title: How to add a settings subtab
---

One sentence: what you will have at the end.

## Before you start

Specific prerequisites — versions, installed tools, configuration state.

## Steps

1. Do the thing.

   ```bash
   the exact command
   ```

   What you should see.

2. Do the next thing.

## Check it worked

A command, a URL, or a test — the reader should never be left wondering.

## When it does not work

Failure modes and their fixes, taken from tests and error-handling code rather than imagined.
```

Every step is an action. No "consider whether…". Use the exact command the reader will type,
never "run the appropriate command".

## Tutorial

Learning-oriented, for a newcomer. Written last, because it consumes the vocabulary the other
three established.

```markdown
---
title: Build your first module
---

What you will build, why it is useful, and what you will understand at the end. Concrete: "you
will build a working X that does Y", not "this tutorial covers X".

## What you need

Tools, versions, prior knowledge, with links.

## Step 1: Start from a clean state

Show every command. Explain each on first use, briefly.

## Step 2: Get something working

## What you built

What the reader now has, and where to go next.
```

**A reader who has not seen something work by the third step will stop.** If the tutorial cannot
reach a visible result that fast, it is structured wrong — cut setup, or start from a scaffold.
Every step produces a visible change. Where a step commonly fails, show the error and the fix
inline rather than deferring to a troubleshooting page.

## Maintained API versions

Keep a single unversioned tree unless readers genuinely need more than one maintained API
contract. When they do, preserve the repository's natural layout and add an ordered registry:

```json
{
  "latest": "v3",
  "versions": [
    { "id": "v3", "source": { "type": "root" } },
    { "id": "v2", "source": { "type": "directory", "path": "v2" } },
    { "id": "v1", "source": { "type": "suffix", "suffix": ".v1" } }
  ]
}
```

The named latest owns unclaimed Markdown at the root. Other versions may use directories,
filename suffixes, or repository-relative manifests with their own redirects. Give every source
file exactly one owner and every version a unique logical route per Page. Link counterparts
within the same version. Where a Page has no counterpart in another version, let the Version
Switcher fall back to that version's root rather than inventing one.
