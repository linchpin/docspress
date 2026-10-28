<p align="center">
  <img src="assets/logo.png" alt="Docspress logo and wordmark" width="680">
</p>

<p align="center">
  <a href="https://github.com/linchpin/docspress/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/linchpin/docspress"></a>
  <a href="LICENSE"><img alt="License: GPL-3.0-or-later" src="https://img.shields.io/badge/license-GPL--3.0--or--later-blue.svg"></a>
  <a href="https://github.com/Automattic/docspress"><img alt="Fork of Automattic/docspress" src="https://img.shields.io/badge/fork%20of-Automattic%2Fdocspress-3858E9?logo=wordpress&amp;logoColor=white"></a>
</p>

<p align="center">
  <strong>Every repository's documentation in git. One WordPress site to publish, edit, and read it.</strong><br>
  Linchpin's fork of DocsPress, for many repositories, many authors, and readers who are people and AI agents alike.
</p>

DocsPress keeps documentation as Markdown in the repository and publishes it to WordPress as native Pages and Gutenberg blocks. A GitHub Action runs the sync. An edit made in WordPress comes back as a pull request, and an edit made on both sides is reported as a conflict instead of overwriting either version. [Automattic/docspress](https://github.com/Automattic/docspress) built all of that, and it is a good piece of work.

This repository is Linchpin's fork. As of 2.2.0 it is nearly 100 commits ahead of upstream and none behind, so it carries everything upstream does. What it adds targets a case upstream was not built for: an agency publishing documentation for dozens of repositories to one WordPress site. People and AI agents write it. Developers, editors, and AI agents read it. Git stays the source of truth throughout, and WordPress stays a place people can actually work in. More than twenty Linchpin repositories publish this way today.

## Upstream or this fork?

**Start with upstream when one repository publishes to one documentation site.** DocsPress was designed around that case and it handles it well: publish, propose, and reconcile modes, manifests and redirects, contextual sidebars, API versioning, a documentation theme with three style families, a block library, `/llms.txt`, and WordPress Playground demos. Upstream also has its own documentation site at [docs.press](https://docs.press/docs/), an npm package, and Automattic behind it. If that describes your project, use upstream. Nothing this fork does replaces it, and every feature below is built on top of it.

**Use this fork when:**

- several repositories publish below one site, and no repository may delete another's Pages;
- the documentation is an API reference that has to stay tied to the code it describes;
- AI agents write some of the docs, and their claims need to cite the source;
- editors work in WordPress every day, and the editor has to stay usable for them;
- you install WordPress packages with Composer and want the Action, theme, and plugin released together.

### What is different

| | Upstream | This fork |
| --- | --- | --- |
| Repositories per site | One per top-level root. `root-slug` is both the URL prefix and the deletion boundary, so two repositories publishing below the same parent trash each other's Pages as removed documentation. | Many below one parent. [`managed-path`](docs/guides/multiple-repositories.md) limits each repository's deletions and reconciliation to its own branch of the tree. |
| Shared parent Pages | Not applicable. | Created by whichever repository runs first, then left to WordPress. Reverse sync never proposes an edit to one. |
| Edit and source links | Every "Propose changes on GitHub" link points at `Automattic/docspress` unless each template overrides `repositoryUrl`. | Point at the repository, ref, and file each Page came from. |
| WordPress edits during `publish` | Overwritten by the Markdown. | Overwritten by default. [`wordpress-edits: conflict`](docs/reference/action-inputs.md) leaves the edited Page alone and reports a conflict. |
| Code samples | Every fence becomes `core/code`. Anything richer needs hand-written block JSON. | A fence carrying metadata becomes Colorful Code that links to the exact lines in source and numbers from the real first line. A bare fence still becomes `core/code`. |
| API reference | Fields / Schema rows. | A [Symbol](docs/reference/gutenberg-blocks/symbol.md) block: signature, parameters, returns, throws, since, deprecated, and a source link. |
| GitHub alerts (`> [!WARNING]`) | Become a quote. | Become a Callout, and come back as the same alert on reverse sync. |
| Sync record in the editor | A Classic block of raw JSON. Converting it to blocks destroys the record. | A locked one-line [Sentinel](docs/reference/sync-and-rest-api.md) placeholder with a **View record** modal. |
| Pages admin | The flat core Pages table. | An opt-in collapsible hierarchy showing each Page's docs version and source path, open to other plugins' columns and actions. |
| Documentation shell | Navigation, search, table of contents, feedback, and `/llms.txt` live in the theme. | The same features live in the DocsPress Blocks plugin. The theme only handles presentation. |
| AI documentation generator | A coverage map from source. | An evidence ledger citing a file and line for every claim, a per-repository [brief](docs/create-docs-with-ai/docs-brief.md), and verification gates. |
| Install | Release zips. | Composer from packagist.linchpin.com, or release zips. |
| Versions | A `0.x` series for the theme and plugin. | One `1.0.0`-and-up line for the Action, theme, and plugin together, cut by release-please. |
| A non-JSON reply from WordPress | Fails with a bare parser error, such as `Unexpected token '<'`. | Reports the status, URL, content type, a body snippet, and the CDN headers support asks for. |

## What the fork adds

The sections below group the changes by who they serve. Each links to the page in [`docs/`](docs/) that covers it in full.

### Many repositories, one site

- **Scoped ownership.** `root-slug` names the shared parent Page and `managed-path` names the branch one repository owns. Deletion and reconciliation never reach outside that branch. Without it, the first workflow to run treats every other repository's Pages as removed documentation. See [Publish several repositories to one site](docs/guides/multiple-repositories.md).
- **Shared parents belong to WordPress.** The first workflow to run creates the parent Page. After that, every workflow leaves it alone and reports it unchanged, so repositories stop rewriting it on every run.
- **Links go to the right repository.** Every managed Page records its repository, ref, and server URL, and edit links and source permalinks read them. Pages published before this change are corrected on the next run.
- **WordPress edits are never lost silently.** In `publish` mode, `wordpress-edits: conflict` reports a Page edited in WordPress since its last sync instead of overwriting it. During reverse sync, an edit to a Page with no Markdown behind it (a directory placeholder, a manifest entry without a source, a redirect) stays in WordPress with a warning, and the rest of the edits are still proposed.

### Developers

- **Code fences carry their provenance.** Add metadata to a fence and it becomes a `docspress/colorful-code` block:

  ````markdown
  ```php title="includes/Core/Bootstrap.php" lines="88-104" {3,7} copy=final
  ```
  ````

  The filename becomes a permalink to those lines in the Page's own repository, and the gutter numbers from line 88. A bare fence stays `core/code`, so repositories that never opt in need no plugin. A promoted fence comes back as the identical fence on reverse sync, so an untouched Page never rewrites its source. See [Markdown and Gutenberg](docs/authoring/markdown-and-gutenberg.md).
- **A block for symbols.** `docspress/symbol` documents one function, method, class, action, filter, CLI command, HTTP endpoint, or constant, including what it extends, implements, and uses. It gives hooks and functions a real signature rather than a row in Fields / Schema with empty columns.
- **GitHub alerts work in both directions.** `> [!NOTE]`, `[!TIP]`, `[!WARNING]`, and `[!CAUTION]` become Callouts, and reverse sync writes them back the same way.
- **Language aliases resolve.** A promoted ```` ```ts ```` renders as TypeScript instead of plaintext. `js`, `sh`, `yml`, `zsh`, and the other common short tags are covered too.

### AI agents, and the people reviewing their work

- **An evidence-first generator.** The bundled `generate-docs-from-source` skill makes an agent build an evidence ledger before writing any prose: one row per documented item, naming the file and line it came from and how it was verified. A code sample is either an excerpt with a path and line range, which renders as a source link, or it says it is illustrative. `--help` output is captured verbatim, and samples are run or marked unverified on the page.
- **A brief per repository.** Commit `.docspress/brief.md` to tell the generator what "finished" means for that repository: its audience, its shape (library, service, catalog, or monorepo), the pages it must have, and the acceptance checks. Dot-directories are never published. See [Write a documentation brief](docs/create-docs-with-ai/docs-brief.md).
- **Markdown one click away.** Upstream already serves `/llms.txt` and a `.md` twin of every Page. The fork adds a Page Details block (`docspress/page-meta`) that shows when the Page last changed and lets a reader copy its Markdown or open the `.md` version, so pasting a Page into an agent takes one click.

### Editors working in WordPress

- **The sync record stays out of the way.** Every synced Page starts with a locked `docspress/sentinel` block. The editor shows it as one line naming the source file. Upstream writes a bare HTML comment, which the editor shows as a Classic block of JSON that one wrong click converts into a paragraph, cutting the Page off from its source. Sites without the plugin can keep the old form with `sentinel-format: comment`.
- **A Pages list built for deep trees.** Turn on the Pages List module under **Settings → DocsPress** to replace **Pages → All Pages** with a collapsible DataViews hierarchy that shows each Page's docs version and GitHub source path. Search flattens the tree, so a Page four levels deep stays findable. A row's **Order** action sets the Page's position among its siblings, unless its Markdown sets `sidebar_position`, which the sync owns. Append `?classic=1` to get the core table back. Other plugins can add columns and actions through hooks. See the [plugin README](plugins/docspress-blocks/README.md#pages-list).
- **The shell is no longer tied to one theme.** Navigation, search, breadcrumbs, table of contents, edit links, feedback, and `/llms.txt` moved from the theme into DocsPress Blocks, and every block reads `--lp-docs-*` design tokens. A brand theme can compose the shell blocks in its own templates and set those tokens to restyle every DocsPress block. The DocsPress theme sets the tokens for you, but it is no longer the only theme that can.

### Releases and operations

- **One version for everything.** The Action, the theme, and the blocks plugin share one version line, cut by release-please from Conventional Commits. The Action emits blocks only this fork's plugin registers, so version skew between them would drop content silently.
- **Composer and release zips.** The theme and plugin install from packagist.linchpin.com, and every GitHub release has both zips attached.
- **Failures that can be diagnosed.** A non-JSON response from WordPress, usually a CDN or firewall page, reports the status, URL, content type, and a body snippet, plus the `cf-ray`, `x-ac`, and `server` headers. An HTTP 406 adds a hint about the hosting firewall rule that usually causes it.
- **CI owns the bundle.** Pull requests carry source only. `main` builds `dist/` after merge, so two branches never conflict over ncc output.

## Quick start

1. Put the Markdown in `docs/`. For a site that several repositories share, nest it one level deeper, as in `docs/<repo-slug>/`.
2. Install the [DocsPress Blocks plugin](#wordpress-packages) on the site. The sync writes a block that only this plugin registers at the top of every Page. On a site that cannot run the plugin, set `sentinel-format: comment`.
3. Store a [WordPress access token](#authentication) as the secret `WP_ACCESS_TOKEN`, on the repository or on its organisation.
4. Add a [workflow](#github-actions), then run it with `status: draft` and `dry-run: true` before anything else.

## WordPress packages

You do not have to install the DocsPress theme. A plain sync works with the site's existing theme and native WordPress blocks.

Install both packages with Composer from packagist.linchpin.com:

```bash
composer require linchpin/docspress linchpin/docspress-blocks
```

Or download them directly:

- [Download the latest DocsPress theme](https://github.com/linchpin/docspress/releases/latest/download/docspress-theme.zip)
- [Download the latest DocsPress Blocks plugin](https://github.com/linchpin/docspress/releases/latest/download/docspress-blocks.zip)

Install the theme together with the Blocks plugin for the complete documentation layout. The plugin registers the documentation shell the theme's templates compose (navigation, search, breadcrumbs, table of contents, edit links, and Page feedback) and serves `/llms.txt` and each Page's `.md` twin. Install the Blocks plugin on its own to get the rich DocsPress blocks. API versioning requires it.

> [!WARNING]
> Install the Blocks plugin from this fork, not from upstream. The sync emits blocks upstream does not register: `docspress/sentinel`, `docspress/symbol`, and source-provenance attributes on `docspress/colorful-code` and `docspress/code-tabs`. Dynamic blocks serialize self-closing, so an unregistered one renders **nothing** on the front end. The content is simply absent, with no error anywhere. In the editor it is worse: the block shows the "Your site doesn't include support for this block" card. `docspress/sentinel` sits at the top of every synced Page, so on a site without this plugin, set [`sentinel-format`](docs/reference/action-inputs.md) to `comment` and the sync writes the legacy HTML comment instead.

## GitHub Actions

### Publish Markdown to WordPress

Create `.github/workflows/sync-docs.yml`:

```yaml
name: Publish documentation

on:
  push:
    branches: [main]
    paths:
      - "docs/**"
      - ".github/workflows/sync-docs.yml"
  workflow_dispatch:

permissions:
  contents: read

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      - uses: linchpin/docspress@v2
        with:
          mode: publish
          wordpress-site: example.wordpress.com
          wordpress-access-token: ${{ secrets.WP_ACCESS_TOKEN }}
          docs-dir: docs
          root-slug: docs
          status: draft
          delete-mode: trash
          dry-run: true
```

Review the Actions summary, then set `dry-run: false`. Publish the Pages only after the draft site looks right.

### Share a site with other repositories

Give every participating repository the same `root-slug` and `root-title`, and give each one its own `managed-path`:

```yaml
      - uses: linchpin/docspress@v2
        with:
          wordpress-site: docs.example.com
          wordpress-access-token: ${{ secrets.WP_ACCESS_TOKEN }}
          docs-dir: docs
          root-slug: wordpress-plugins
          root-title: WordPress Plugins
          managed-path: wordpress-plugins/my-plugin
          wordpress-edits: conflict
```

With the Markdown at `docs/my-plugin/`, this publishes below `/wordpress-plugins/my-plugin/` and touches nothing else. Run each repository once with `dry-run: true` and confirm the summary reports no deletions. A deletion of another repository's route means `managed-path` is missing or too broad. Versioning stores one documentation root per site, so repositories that share a parent Page cannot each enable it.

### Reconcile GitHub and WordPress

Once one-way publishing works, use a single `reconcile` workflow to handle edits from either side:

```yaml
name: Reconcile documentation

on:
  push:
    branches: [main]
    paths:
      - "docs/**"
      - ".github/workflows/sync-docs.yml"
  schedule:
    - cron: "3/5 * * * *"
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write

concurrency:
  group: docspress-sync
  cancel-in-progress: false

jobs:
  sync:
    if: >-
      github.event_name != 'push' ||
      !contains(
        github.event.head_commit.message,
        format('from {0}/docspress/wordpress-sync', github.repository_owner)
      )
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      - uses: linchpin/docspress@v2
        with:
          mode: reconcile
          wordpress-site: example.wordpress.com
          wordpress-access-token: ${{ secrets.WP_ACCESS_TOKEN }}
          docs-dir: docs
          root-slug: docs
          status: publish
          delete-mode: trash
```

WordPress-only edits become a rolling Markdown pull request. A true two-sided edit is reported as a conflict instead of overwriting either version.

Every input and output is listed in [Action inputs](docs/reference/action-inputs.md).

## Authentication

DocsPress reads its token from the GitHub Actions secret `WP_ACCESS_TOKEN`. Set it as a repository secret, or once as an organisation secret when several repositories publish to the same site. A repository secret takes precedence over an organisation secret with the same name.

`gh secret list --repo OWNER/REPO` lists repository secrets only, so a token set on the organisation does not appear there. Listing organisation secrets with `gh secret list --org ORG` needs the `admin:org` scope. When neither listing is available, the first `dry-run: true` run is the check. A missing secret stops it with `Input required and not supplied: wordpress-access-token`, and a token WordPress rejects fails with a 401 or 403.

### WordPress.com

DocsPress uses a WordPress.com OAuth token stored as the secret `WP_ACCESS_TOKEN`.

1. Create an app at [WordPress.com Apps](https://developer.wordpress.com/apps/).
2. Set the redirect URL to `http://localhost:8787/callback`.
3. Authenticate the GitHub CLI with `gh auth login`.
4. Run the token helper from a trusted local terminal:

```bash
printf "WordPress.com client secret: "
IFS= read -r -s DOCSPRESS_CLIENT_SECRET
printf "\n"
npx docspress@0.4.1 token \
  --client-id YOUR_CLIENT_ID \
  --client-secret "$DOCSPRESS_CLIENT_SECRET" \
  --site example.wordpress.com \
  --repo OWNER/REPO \
  --set-secret
unset DOCSPRESS_CLIENT_SECRET
```

The `docspress` npm package is upstream's. This fork does not publish to npm, and its token helper is identical to upstream's, so the published package works. From a clone of this repository, `npm run token --` with the same flags runs the same script.

The helper opens WordPress.com for authorization and stores the resulting token on `--repo` without printing it. Confirm only the secret name:

```bash
gh secret list --repo OWNER/REPO
```

### Self-hosted WordPress (.org)

DocsPress can use a REST API key from your host or authentication plugin when it accepts `Authorization: Bearer …`. Core WordPress does not create this key itself.

Store the key without printing it:

```bash
printf "WordPress REST API key: "
IFS= read -r -s WORDPRESS_REST_API_KEY
printf "\n"
printf "%s" "$WORDPRESS_REST_API_KEY" |
  gh secret set WP_ACCESS_TOKEN --repo OWNER/REPO
unset WORDPRESS_REST_API_KEY
```

To share the key across repositories, replace `--repo OWNER/REPO` with `--org ORG --visibility selected --repos REPO_A,REPO_B`, or `--visibility all`.

Set `wordpress-url` to the site origin without `/wp-json`:

```yaml
wordpress-url: https://docs.example.com
wordpress-site: docs.example.com
wordpress-access-token: ${{ secrets.WP_ACCESS_TOKEN }}
```

DocsPress calls `https://docs.example.com/wp-json/wp/v2/pages`. Confirm that the key can read, create, update, and delete Pages before publishing.

For the complete setup, see [Authenticate WordPress](docs/publish-existing-docs/authentication.md).

## Write documentation with AI agents

This repository ships two agent skills, in `.agents/skills/` and `.claude/skills/`:

- `generate-docs-from-source` derives a DocsPress-ready Markdown tree from code and tests, following the evidence ledger and brief described above.
- `docspress-install` wires a repository to a WordPress site and walks it from a dry run, through drafts, to published Pages.

Both differ from upstream's versions, so install them from this repository rather than from `Automattic/docspress`:

```bash
npx skills add linchpin/docspress --all --full-depth
```

The Linchpin skills library vendors `generate-docs-from-source` from here, alongside its own `docspress-publish` skill for docs.linchpin.com.

## Preview and Playground

The Playground blueprints in `theme/` still clone `Automattic/docspress`, so these previews run **upstream's** theme and plugin. They show the shared foundation accurately. Fork-only blocks such as Symbol, Sentinel, and Page Details do not appear in them.

Preview a local `docs/` directory, from the repository that contains it:

```bash
npx @wp-playground/cli@3.1.46 start \
  --blueprint=https://raw.githubusercontent.com/Automattic/docspress/main/theme/blueprint-local-docs.json \
  --mount="$PWD/docs:/wordpress/docspress-source-docs" \
  --no-auto-mount \
  --reset
```

WordPress Playground imports the Markdown as editable Pages and opens `/docs/`.

- [Default documentation site](https://playground.wordpress.net/?blueprint-url=https%3A%2F%2Fraw.githubusercontent.com%2FAutomattic%2Fdocspress%2Fmain%2Ftheme%2Fblueprint-docs.json&page-title=DocsPress%20Documentation)
- [Contextual sidebars](https://playground.wordpress.net/?blueprint-url=https%3A%2F%2Fraw.githubusercontent.com%2FAutomattic%2Fdocspress%2Fmain%2Ftheme%2Fblueprint-sidebars.json&page-title=DocsPress%20Contextual%20Sidebars)
- [Versioned API documentation](https://playground.wordpress.net/?blueprint-url=https%3A%2F%2Fraw.githubusercontent.com%2FAutomattic%2Fdocspress%2Fmain%2Ftheme%2Fblueprint-versioning.json&page-title=DocsPress%20Versioning%20Example)
- [Stock WordPress, no DocsPress theme or plugin](https://playground.wordpress.net/?blueprint-url=https%3A%2F%2Fraw.githubusercontent.com%2FAutomattic%2Fdocspress%2Fmain%2Fexamples%2Fstock-wordpress%2Fblueprint.json&page-title=DocsPress%20on%20Stock%20WordPress)

## Releases and versioning

<!-- x-release-please-start-version -->
Current release: `2.2.0`
<!-- x-release-please-end -->

This fork is its own product line. Upstream versions the theme and plugin in a `0.x` series. Ours starts at `1.0.0`, so an upstream release can never sort above what we publish. Before that break, both claimed `0.10.7`, and nothing (not Composer, not the WordPress admin, not SatisPress) could tell them apart.

All three artifacts here share one version: the Action, the theme, and the blocks plugin. They have to move together. The Action emits blocks only our plugin registers, so a sync from a newer Action against an older plugin drops that content silently.

Releases are cut by [release-please](https://github.com/googleapis/release-please) from [Conventional Commits](https://www.conventionalcommits.org) on `main`. Nobody edits a version by hand:

1. `commitlint` enforces the message format on commit (`feat(LINCHPIN-1234): Subject`, or `NO-TASK`).
2. release-please opens a release pull request as commits land.
3. Merging it tags the release, bumps every version header, and writes `CHANGELOG.md`.
4. The same run then moves the floating major tag, attaches both zips to the release, and installs the theme and plugin on packagist.linchpin.com.

### Consuming the action

Reference this action as `linchpin/docspress@v2`.

The floating major tag follows the shared version line, so a breaking change in any of the three artifacts starts a new major for all of them. That includes the Action, even when its own inputs did not change. `2.0.0` renamed the theme and plugin design tokens, and the Action moved to `v2` with them. `v2` moves forward as fixes and backwards-compatible inputs land on `main`. `v1` stays at `1.3.1` and receives nothing newer, including `wordpress-edits` and the 2.2.0 fixes for shared parent Pages.

Do not pin a commit SHA. SHA pinning defends against a third party repointing a tag under you. This is a Linchpin fork in the Linchpin organisation, behind branch protection, consumed only by Linchpin repositories. That is the same trust boundary, so the pin buys nothing and costs a great deal. Seven repositories were pinned to one SHA for a month, and none of them received the fix that reports what WordPress actually returned, which made a real sync failure undiagnosable.

Genuinely third-party actions in these workflows, such as `actions/checkout`, should still be pinned.

### Tracking upstream

`upstream` is `Automattic/docspress`. Nothing merges from it automatically. This fork carries changes upstream does not have, and at the time of writing upstream has merged no external pull request. Fetch and review deliberately:

```bash
git fetch upstream
git log --oneline main..upstream/main
```

Changes here that are not Linchpin-specific are worth proposing upstream. Once one merges, this fork no longer has to carry it.

## Development

```bash
npm ci
npm test
npm run lint
```

Pull requests carry source only. CI fails a pull request that contains `dist/`, because `main` rebuilds the bundle after each merge. CI also checks that the agent skills' block catalog matches the plugin:

```bash
node scripts/generate-block-catalog.mjs --check
```

Commit messages follow `type(LINCHPIN-1234): Subject`, or `NO-TASK` when there is no task, and a husky hook enforces it.

## Documentation

The [`docs/`](docs/) directory is the source for this fork's documentation. The pages that cover what the fork adds:

- [Publish several repositories to one site](docs/guides/multiple-repositories.md)
- [Markdown and Gutenberg](docs/authoring/markdown-and-gutenberg.md), including fence metadata and GitHub alerts
- [Symbol block](docs/reference/gutenberg-blocks/symbol.md)
- [Write a documentation brief](docs/create-docs-with-ai/docs-brief.md)
- [Sync and REST API](docs/reference/sync-and-rest-api.md), including the Sentinel block
- [Action inputs and outputs](docs/reference/action-inputs.md)
- [Troubleshooting](docs/troubleshooting.md)

The rest of DocsPress is covered by upstream's documentation at [docs.press/docs](https://docs.press/docs/), which describes upstream's behavior, without this fork's additions:

- [the first safe synchronization](https://docs.press/docs/publish-existing-docs/first-sync/)
- [GitHub-to-WordPress publishing](https://docs.press/docs/guides/github-to-wordpress/)
- [continuous two-way synchronization](https://docs.press/docs/guides/continuous-sync/)
- [API versioning](https://docs.press/docs/guides/versioning/)

## Credits and license

DocsPress was created by Fatih Kadir Akin at [Automattic/docspress](https://github.com/Automattic/docspress). This fork is maintained by [Linchpin](https://linchpin.com) and keeps the original license, [GPL-3.0-or-later](LICENSE).
