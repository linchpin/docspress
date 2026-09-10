---
title: Version Switcher
sidebar_position: 170
---

Use `docspress/version-switcher` to let a reader move between maintained versions of the same
page.

## When to use it

This is a **template block, not a page block.** The bundled Header places it before Command
Search, which is where it belongs: one control, on every page, in a predictable position.
Serializing it into Markdown pages puts a second switcher in the body of some pages and none
in others.

The switcher links to the counterpart of the current page in each version. Where a page has
no counterpart it falls back to that version's root rather than inventing a URL, and shows
`unavailableLabel` instead of a working link.

With `hideSingle` on — the default — it renders nothing when the site has one version, so it
is safe to leave in a shared template used by unversioned sites.

See [Maintained API versions](../../guides/versioning.md) for the registry, and
[Version Notice](version-notice.md) for the banner that warns a reader they are not on the
latest.

## Attributes

<!-- docspress:block
{
  "version": 1,
  "name": "docspress/fields",
  "attrs": {
    "title": "Version Switcher attributes",
    "description": "Presentation of the version control.",
    "fields": [
      {
        "name": "label",
        "type": "string",
        "required": false,
        "defaultValue": "Version",
        "description": "\u003cp\u003eText beside the control.\u003c/p\u003e",
        "values": "",
        "deprecated": false
      },
      {
        "name": "showLabel",
        "type": "boolean",
        "required": false,
        "defaultValue": "true",
        "description": "\u003cp\u003eShow the label. Hide it where the surrounding template already says what the control does.\u003c/p\u003e",
        "values": "true, false",
        "deprecated": false
      },
      {
        "name": "presentation",
        "type": "enum",
        "required": false,
        "defaultValue": "select",
        "description": "\u003cp\u003eRender as a dropdown or as a row of links.\u003c/p\u003e",
        "values": "select, links",
        "deprecated": false
      },
      {
        "name": "showLatestBadge",
        "type": "boolean",
        "required": false,
        "defaultValue": "true",
        "description": "\u003cp\u003eMark which version is current.\u003c/p\u003e",
        "values": "true, false",
        "deprecated": false
      },
      {
        "name": "hideSingle",
        "type": "boolean",
        "required": false,
        "defaultValue": "true",
        "description": "\u003cp\u003eRender nothing when only one version exists, so an unversioned site shows no empty control.\u003c/p\u003e",
        "values": "true, false",
        "deprecated": false
      },
      {
        "name": "unavailableLabel",
        "type": "string",
        "required": false,
        "defaultValue": "Page unavailable",
        "description": "\u003cp\u003eShown for a version that has no counterpart of this page.\u003c/p\u003e",
        "values": "",
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
| `label` | `string` | no | `Version` | Text beside the control. |
| `showLabel` | `boolean` | no | `true` | Show the label. Hide it where the surrounding template already says what the control does. |
| `presentation` | `enum` | no | `select` | Render as a dropdown or as a row of links. |
| `showLatestBadge` | `boolean` | no | `true` | Mark which version is current. |
| `hideSingle` | `boolean` | no | `true` | Render nothing when only one version exists, so an unversioned site shows no empty control. |
| `unavailableLabel` | `string` | no | `Page unavailable` | Shown for a version that has no counterpart of this page. |
<!-- /docspress:block -->

## Examples

The default dropdown:

<!-- docspress:block
{
  "version": 1,
  "name": "docspress/version-switcher",
  "attrs": {
    "label": "Version",
    "showLabel": true,
    "presentation": "select",
    "showLatestBadge": true,
    "hideSingle": true,
    "unavailableLabel": "Page unavailable"
  }
}
-->
**Version:** _WordPress version switcher_
<!-- /docspress:block -->

Links instead of a dropdown, kept visible even with one version:

<!-- docspress:block
{
  "version": 1,
  "name": "docspress/version-switcher",
  "attrs": {
    "label": "API version",
    "showLabel": true,
    "presentation": "links",
    "showLatestBadge": true,
    "hideSingle": false,
    "unavailableLabel": "Not in this version"
  }
}
-->
**API version:** _WordPress version switcher_
<!-- /docspress:block -->

A bare control for a header that already provides its own label:

<!-- docspress:block
{
  "version": 1,
  "name": "docspress/version-switcher",
  "attrs": {
    "label": "Version",
    "showLabel": false,
    "presentation": "select",
    "showLatestBadge": false,
    "hideSingle": true,
    "unavailableLabel": "Page unavailable"
  }
}
-->
**Version:** _WordPress version switcher_
<!-- /docspress:block -->
