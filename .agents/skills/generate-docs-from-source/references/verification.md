# Verification

Commands for the check ladder in step 5. Run the cheapest relevant checks first and record
exact results. A check that cannot run is reported with the reason, and the claim it would have
supported is narrowed.

Every command assumes the repository root and a `docs/` tree; adjust the glob to the brief's
`docs-dir`.

## 1. Pages are real

```bash
# Nonempty, and no two files normalizing to the same route
find docs -name '*.md' -size -2c
find docs -name '*.md' | sed 's/\.md$//' | tr 'A-Z' 'a-z' | sort | uniq -d
```

Every page needs a frontmatter `title` and no `h1` in the body — the theme renders the title:

```bash
for f in $(find docs -name '*.md'); do
  head -1 "$f" | grep -q '^---$' || echo "NO FRONTMATTER: $f"
  grep -qE '^# ' "$f" && echo "H1 IN BODY: $f"
done
```

## 2. Links resolve

```bash
for f in $(find docs -name '*.md'); do
  grep -oE '\]\(([^)#]+\.md)(#[^)]*)?\)' "$f" | sed -E 's/\]\(([^)#]+).*/\1/' | while read -r link; do
    [ -e "$(dirname "$f")/$link" ] || echo "BROKEN: $f -> $link"
  done
done
```

## 3. Code provenance resolves

The check that makes the provenance rule real rather than aspirational. Every path a code block
claims must exist, and every line range must be inside the file:

```bash
# Paths named by a block attribute
grep -rhoE '"(sourcePath|filename)":"[^"]+"' docs/ \
  | sed 's/.*:"//;s/"//' | sort -u \
  | while read -r p; do [ -e "$p" ] || echo "MISSING PATH: $p"; done

# Paths named by a fence info string
grep -rhoE '```[a-z]* +title="[^"]+"' docs/ \
  | sed -E 's/.*title="([^"]+)".*/\1/' | sort -u \
  | while read -r p; do [ -e "$p" ] || echo "MISSING PATH: $p"; done
```

Line ranges, checked against the file's real length:

```bash
grep -rhoE 'lines="([0-9]+)(-[0-9]+)?"[^`]*|"sourceEndLine":[0-9]+' docs/ >/dev/null
# For each excerpt, confirm sourceEndLine <= wc -l of the file it names.
```

A path that does not resolve is a defect, not a warning. It means the excerpt was written from
memory, or the file moved and the docs did not.

## 4. Signatures match source

For each ledger row, re-derive the fact and compare. There is no generic command — that is the
point — but these narrow the search:

```bash
rg -n 'function <name>|const <name>|class <name>' --type-add 'src:*.{php,js,ts,tsx}' -tsrc
rg -n "apply_filters\(\s*'<hook>'|do_action\(\s*'<hook>'"
rg -n "register_rest_route|->add_command\(|addCommand\("
```

## 5. Help output is captured, not paraphrased

```bash
<command> --help 2>&1 | tee /tmp/help.txt
diff <(sed -n '/```/,/```/p' docs/reference/cli.md) /tmp/help.txt
```

If the command cannot run safely here, say so and mark the block unverified.

## 6. Samples run

Run each runnable sample in a scratch directory, never against the working tree or a live
service. Prefer samples already covered by tests. Anything not run is marked on the page as
well as in the report — a caption saying so, not a silent omission.

## 7. No placeholders survive

```bash
rg -n 'TODO|TBD|FIXME|YOUR_[A-Z_]+|example\.com|<your-|lorem ipsum' docs/
```

Deliberate placeholders stay only inside clearly labelled templates.

## 8. Block payloads parse and validate

```bash
node --input-type=module -e '
import fs from "node:fs";
import path from "node:path";

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(md|markdown)$/.test(entry.name)) files.push(full);
  }
})("docs");

let failures = 0;
for (const file of files) {
  const source = fs.readFileSync(file, "utf8");

  // Envelope form
  for (const match of source.matchAll(/<!--\s*docspress:block\s*([\s\S]*?)-->/g)) {
    try {
      const config = JSON.parse(match[1]);
      if (config.version !== 1) throw new Error(`version ${config.version}`);
      if (!/^[a-z][a-z0-9_-]*\/[a-z][a-z0-9_-]*$/.test(config.name)) throw new Error(`name ${config.name}`);
    } catch (error) {
      console.error(`${file}: ${error.message}`);
      failures++;
    }
  }

  // Legacy bare-comment form
  for (const match of source.matchAll(/<!--\s*wp:(docspress\/[a-z-]+)\s+(\{[\s\S]*?\})\s*\/-->/g)) {
    try {
      JSON.parse(match[2]);
    } catch (error) {
      console.error(`${file}: ${match[1]} ${error.message}`);
      failures++;
    }
  }
}
console.log(failures ? `${failures} invalid payloads` : "all block payloads parse");
process.exit(failures ? 1 : 0);
'
```

Then check the block names and enum values against the catalog —
[`block-catalog.md`](block-catalog.md), which is generated from the target plugin revision's
`blocks/*/block.php`. **A value outside an allow-list is accepted silently and rendered as the
block's default**, so this check is the only thing standing between a typo and a page that
looks subtly wrong to a reader and correct to you.

## 9. Converter round-trip

Run representative Markdown through the pinned DocsPress converter and confirm every block
survives.

**Parse both sides and compare the attribute objects. Do not compare bytes.** DocsPress
deliberately normalizes HTML-sensitive attribute characters to WordPress-safe Unicode escapes —
`<` becomes `\u003c`, `>` becomes `\u003e`, `&` becomes `\u0026` and `--` becomes
`\u002d\u002d` — so most blocks come back altered and none of it is a defect.

```bash
node --input-type=module -e '
import { markdownToBlocks } from "<pinned-docspress>/src/markdown.js";
import { blocksToMarkdown } from "<pinned-docspress>/src/reverse.js";
import fs from "node:fs";

const source = fs.readFileSync(process.argv[1], "utf8");
const { blocks } = markdownToBlocks(source, { fallbackTitle: "Docs" });
const back = blocksToMarkdown(blocks);
const again = markdownToBlocks(back, { fallbackTitle: "Docs" }).blocks;
console.log(again === blocks ? "stable" : "DRIFT — the round-trip is not idempotent");
' docs/reference/api.md
```

## 10. Version registry

With a `docs-versions.json`, run the pinned collector and verify source ownership, safe paths,
unique logical routes, latest ownership, per-version redirects, and version-aware links.

## 11. The repository's own gates

Inspect scripts and dependency lifecycle hooks before running them. Then run the repository's
formatter, lint, typecheck, tests, and build in proportion to the change. Isolate anything that
rewrites generated files into a temporary copy or worktree.

## 12. Nothing leaked, nothing else changed

```bash
git diff --check
git diff --stat -- . ':(exclude)docs'   # should be empty: generating docs changes only docs
```

Then scan the docs diff for credential-shaped strings:

```bash
git diff -- docs | grep '^+' | rg -n \
  'AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|sk-[A-Za-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY|xox[baprs]-|eyJ[A-Za-z0-9_-]{10,}\.'
```

Two distinct risks. A generated configuration example invents a plausible-looking key, which
becomes a support problem when someone tries it. Worse, a real key gets copied out of a `.env`
or a fixture read during inventory, which is an incident. Both look identical in a diff, so
scan rather than trusting recall.

## 13. Brief acceptance checks

Last. Run each one and report it as met or unmet, with the number or name it produced. An unmet
requirement is a reported gap, never a silent omission.
