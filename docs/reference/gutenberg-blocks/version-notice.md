---
title: Version Notice
sidebar_position: 160
---

Use `docspress/version-notice` to tell a reader they are looking at documentation for a
version that is no longer the latest.

## When to use it

This is a **template block, not a page block.** Place it in the Page template, below the
Header, so it applies to every versioned page at once. Serializing it into individual
Markdown pages means editing every page when the wording changes, and it will render on
pages that are not versioned at all.

It renders only on a historical version. On the latest version, and on a site with no
version registry, it renders nothing — so leaving it in the template is safe.

See [Maintained API versions](../../guides/versioning.md) for the registry that
decides which version is latest, and [Version Switcher](version-switcher.md) for the control
that moves between them.

## Attributes

<!-- docspress:block
{
  "version": 1,
  "name": "docspress/fields",
  "attrs": {
    "title": "Version Notice attributes",
    "description": "Wording and behaviour of the historical-version bar.",
    "fields": [
      {
        "name": "message",
        "type": "string",
        "required": false,
        "defaultValue": "You are viewing {current}. The latest version is {latest}.",
        "description": "\u003cp\u003eNotice text. Only the \u003ccode\u003e{current}\u003c/code\u003e and \u003ccode\u003e{latest}\u003c/code\u003e placeholders are substituted; any other brace expression is printed literally.\u003c/p\u003e",
        "values": "",
        "deprecated": false
      },
      {
        "name": "latestLinkLabel",
        "type": "string",
        "required": false,
        "defaultValue": "Switch to latest",
        "description": "\u003cp\u003eLink text pointing at the latest version. Leave empty to show no link.\u003c/p\u003e",
        "values": "",
        "deprecated": false
      },
      {
        "name": "showIcon",
        "type": "boolean",
        "required": false,
        "defaultValue": "true",
        "description": "\u003cp\u003eShow the warning icon.\u003c/p\u003e",
        "values": "true, false",
        "deprecated": false
      },
      {
        "name": "dismissible",
        "type": "boolean",
        "required": false,
        "defaultValue": "false",
        "description": "\u003cp\u003eLet a reader close the notice for the rest of the session.\u003c/p\u003e",
        "values": "true, false",
        "deprecated": false
      }
    ],
    "searchable": false,
    "compact": true
  }
}
-->
| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `message` | `string` | no | `You are viewing {current}. The latest version is {latest}.` | Notice text. Only the \u003ccode\u003e{current}\u003c/code\u003e and \u003ccode\u003e{latest}\u003c/code\u003e placeholders are substituted; any other brace expression is printed literally. |
| `latestLinkLabel` | `string` | no | `Switch to latest` | Link text pointing at the latest version. Leave empty to show no link. |
| `showIcon` | `boolean` | no | `true` | Show the warning icon. |
| `dismissible` | `boolean` | no | `false` | Let a reader close the notice for the rest of the session. |
<!-- /docspress:block -->

## Examples

The default notice:

<!-- docspress:block
{
  "version": 1,
  "name": "docspress/version-notice",
  "attrs": {
    "message": "You are viewing {current}. The latest version is {latest}.",
    "latestLinkLabel": "Switch to latest",
    "showIcon": true,
    "dismissible": false
  }
}
-->
> [!WARNING]
>
> You are viewing {current}. The latest version is {latest}.
>
> **Switch to latest**
<!-- /docspress:block -->

A stronger message for an unmaintained version, which the reader can dismiss:

<!-- docspress:block
{
  "version": 1,
  "name": "docspress/version-notice",
  "attrs": {
    "message": "{current} is no longer maintained. Security fixes land in {latest} only.",
    "latestLinkLabel": "Read the current docs",
    "showIcon": true,
    "dismissible": true
  }
}
-->
> [!WARNING]
>
> {current} is no longer maintained. Security fixes land in {latest} only.
>
> **Read the current docs**
<!-- /docspress:block -->

A plain label, with no icon and no link:

<!-- docspress:block
{
  "version": 1,
  "name": "docspress/version-notice",
  "attrs": {
    "message": "Documentation for {current}.",
    "latestLinkLabel": "",
    "showIcon": false,
    "dismissible": false
  }
}
-->
> [!WARNING]
>
> Documentation for {current}.
<!-- /docspress:block -->
