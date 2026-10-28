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

## The shared parent Page belongs to WordPress

Every participating repository generates the shared parent Page, so no one repository can own it. The first workflow to run creates it; after that, every workflow leaves it alone and reports it as unchanged. Edit its title and content in WordPress, the same way as any other Page that no repository manages. An existing unmanaged Page at that path also works as the parent.

Give each workflow the same `root-slug` and `root-title` anyway, so whichever one runs first creates the same Page. Changing `root-title` later does not retitle a parent that already exists.

Reverse synchronization never proposes an edit to the shared parent, and never reports one as a conflict, because there is no single Markdown tree to write the edit to.

## Verify before publishing

Run each repository once with `dry-run: true` and confirm the summary reports no deletions. A deletion of another repository's route means `managed-path` is missing or too broad.

## Limitations

`versions-file` stores one documentation root per site, so a group of repositories sharing a parent Page cannot each enable versioning. Use versioning on a site that publishes a single repository.
