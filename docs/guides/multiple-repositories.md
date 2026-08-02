---
title: Publish several repositories to one site
sidebar_position: 47
---

One WordPress site can host documentation from several repositories below a shared parent Page, so a group of plugins lands under `/wordpress-plugins/` and a group of services lands under `/services/`. Each repository runs its own workflow and owns only its own branch of the tree.

## Choose the shared parent and the owned branch

Two inputs describe the arrangement:

| Input | Purpose |
| --- | --- |
| `root-slug` | The shared parent Page every participating repository publishes below. |
| `managed-path` | The branch a single repository owns. Deletions and reconciliation never reach outside it. |

Without `managed-path`, a repository owns everything below `root-slug`. That is correct for a single repository and wrong for a group: the first workflow to run would treat every other repository's Pages as removed documentation and trash them.

## Nest the Markdown one directory deep

Route segments come from the directory layout below `docs-dir`, so the owned branch is created by an ordinary directory:

```
mantle/
  docs/
    mantle/
      index.md
      guides/install.md
```

## Configure each repository

```yaml
# repository: mantle
- uses: Automattic/docspress@FULL_COMMIT_SHA
  with:
    wordpress-site: example.com
    wordpress-access-token: ${{ secrets.WP_ACCESS_TOKEN }}
    docs-dir: docs
    root-slug: wordpress-plugins
    root-title: WordPress Plugins
    managed-path: wordpress-plugins/mantle
```

```yaml
# repository: linchpin-blocks
- uses: Automattic/docspress@FULL_COMMIT_SHA
  with:
    wordpress-site: example.com
    wordpress-access-token: ${{ secrets.WP_ACCESS_TOKEN }}
    docs-dir: docs
    root-slug: wordpress-plugins
    root-title: WordPress Plugins
    managed-path: wordpress-plugins/linchpin-blocks
```

The two workflows produce:

```
/wordpress-plugins/mantle/guides/install/
/wordpress-plugins/linchpin-blocks/guides/install/
```

Relative Markdown links resolve within each repository's own branch, so `[Home](../index.md)` in the Mantle tree becomes `/wordpress-plugins/mantle/`.

## Keep the shared parent Page identical

Every participating repository generates the same shared parent Page. Give each workflow the same `root-slug`, `root-title`, `status`, and `create-h1` so they produce identical content. Matching values make the Page report as unchanged after the first repository creates it. Differing values make each workflow rewrite the Page on every run.

## Verify before publishing

Run each repository once with `dry-run: true` and confirm the summary reports no deletions. A deletion of another repository's route means `managed-path` is missing or too broad.

## Limitations

`versions-file` stores one documentation root per site, so a group of repositories sharing a parent Page cannot each enable versioning. Use versioning on a site that publishes a single repository.
