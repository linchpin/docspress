---
title: Symbol
sidebar_position: 95
---

Use `docspress/symbol` for one entry in an API reference: a function, method, class, action,
filter, CLI command, HTTP endpoint, or constant. It carries the signature, the parameters,
what comes back, and a link to the declaration in source.

## When to use it

Reach for Symbol when the subject **is** a named thing in the code and a reader needs to call
it correctly.

Use [Fields / Schema](fields.md) instead for a set of typed values that are not a callable —
configuration keys, environment variables, response properties. The distinction matters: a
hook has a signature, a return, and a location in source, and squeezing one into a field row
leaves the type, default, and constraint columns empty.

Use [API Request / Response](api-request.md) when the lesson is one HTTP exchange with real
headers and a real body, and [Terminal Session](terminal-session.md) when it is a command the
reader copies rather than an interface they call.

## Edit the block

Set the kind, name, and signature. Copy the signature from source rather than retyping it —
the whole point of the block is that a reader can trust it.

Add parameters in the sidebar. Each takes a name, an optional type, a required toggle, a
default, and a description.

Fill in **Source path** and the line numbers to turn the header into a permalink. The
repository, ref, and server URL come from the metadata the synchronization Action already
writes onto every page, so nothing extra is needed in the workflow. Set **Ref** only to pin a
symbol to a tag that differs from the branch the docs were synchronised from.

Anything in **Deprecated** marks the symbol deprecated and renders the text as a warning, so
leave it empty for a current symbol.

## Attributes

<!-- docspress:block
{
  "version": 1,
  "name": "docspress/fields",
  "attrs": {
    "title": "Symbol attributes",
    "description": "Identity, signature, parameters, and provenance accepted by \u003ccode\u003edocspress/symbol\u003c/code\u003e.",
    "fields": [
      {
        "name": "kind",
        "type": "enum",
        "required": false,
        "defaultValue": "function",
        "description": "\u003cp\u003eWhat the symbol is. Sets the badge and nothing else.\u003c/p\u003e",
        "values": "function, method, class, hook, filter, command, endpoint, constant",
        "deprecated": false
      },
      {
        "name": "name",
        "type": "string",
        "required": true,
        "defaultValue": "",
        "description": "\u003cp\u003eThe symbol as a reader would search for it. An empty name renders nothing.\u003c/p\u003e",
        "values": "",
        "deprecated": false
      },
      {
        "name": "signature",
        "type": "string",
        "required": false,
        "defaultValue": "",
        "description": "\u003cp\u003eThe declaration, copied from source rather than paraphrased.\u003c/p\u003e",
        "values": "",
        "deprecated": false
      },
      {
        "name": "language",
        "type": "enum",
        "required": false,
        "defaultValue": "php",
        "description": "\u003cp\u003eHighlighting for the signature.\u003c/p\u003e",
        "values": "bash, cpp, css, diff, html, http, ini, javascript, json, jsx, markdown, php, plaintext, python, scss, shell, sql, toml, tsx, twig, typescript, xml, yaml",
        "deprecated": false
      },
      {
        "name": "summary",
        "type": "string",
        "required": false,
        "defaultValue": "",
        "description": "\u003cp\u003eWhat it does, in one or two sentences. Formatted HTML.\u003c/p\u003e",
        "values": "",
        "deprecated": false
      },
      {
        "name": "parameters",
        "type": "array",
        "required": false,
        "defaultValue": "",
        "description": "\u003cp\u003eUp to 30 entries of \u003ccode\u003ename\u003c/code\u003e, \u003ccode\u003etype\u003c/code\u003e, \u003ccode\u003erequired\u003c/code\u003e, \u003ccode\u003edefaultValue\u003c/code\u003e, and \u003ccode\u003edescription\u003c/code\u003e. An entry with no name is dropped.\u003c/p\u003e",
        "values": "",
        "deprecated": false
      },
      {
        "name": "returns",
        "type": "string",
        "required": false,
        "defaultValue": "",
        "description": "\u003cp\u003eWhat comes back, including the failure value.\u003c/p\u003e",
        "values": "",
        "deprecated": false
      },
      {
        "name": "throws",
        "type": "string",
        "required": false,
        "defaultValue": "",
        "description": "\u003cp\u003eExceptions or error conditions the caller has to handle.\u003c/p\u003e",
        "values": "",
        "deprecated": false
      },
      {
        "name": "since",
        "type": "string",
        "required": false,
        "defaultValue": "",
        "description": "\u003cp\u003eVersion the symbol appeared in.\u003c/p\u003e",
        "values": "",
        "deprecated": false
      },
      {
        "name": "deprecated",
        "type": "string",
        "required": false,
        "defaultValue": "",
        "description": "\u003cp\u003eWhat to use instead. Any value marks the symbol deprecated; leave it empty for a current one.\u003c/p\u003e",
        "values": "",
        "deprecated": false
      },
      {
        "name": "sourcePath",
        "type": "string",
        "required": false,
        "defaultValue": "",
        "description": "\u003cp\u003eRepository-relative path to the declaration.\u003c/p\u003e",
        "values": "",
        "deprecated": false
      },
      {
        "name": "sourceStartLine",
        "type": "number",
        "required": false,
        "defaultValue": "0",
        "description": "\u003cp\u003eFirst line of the declaration. Becomes the line anchor in the source link.\u003c/p\u003e",
        "values": "",
        "deprecated": false
      },
      {
        "name": "sourceEndLine",
        "type": "number",
        "required": false,
        "defaultValue": "0",
        "description": "\u003cp\u003eLast line of the declaration.\u003c/p\u003e",
        "values": "",
        "deprecated": false
      },
      {
        "name": "sourceRef",
        "type": "string",
        "required": false,
        "defaultValue": "",
        "description": "\u003cp\u003eBranch or tag to link against. Defaults to the ref the page was synchronised from.\u003c/p\u003e",
        "values": "",
        "deprecated": false
      }
    ],
    "searchable": true,
    "compact": false
  }
}
-->
| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `kind` | `enum` | no | `function` | What the symbol is. Sets the badge and nothing else. |
| `name` | `string` | yes |  | The symbol as a reader would search for it. |
| `signature` | `string` | no |  | The declaration, copied from source rather than paraphrased. |
| `language` | `enum` | no | `php` | Highlighting for the signature. |
| `summary` | `string` | no |  | What it does, in one or two sentences. |
| `parameters` | `array` | no |  | Up to 30 entries of name, type, required, defaultValue, description. |
| `returns` | `string` | no |  | What comes back, including the failure value. |
| `throws` | `string` | no |  | Exceptions or error conditions the caller has to handle. |
| `since` | `string` | no |  | Version the symbol appeared in. |
| `deprecated` | `string` | no |  | What to use instead. Any value marks the symbol deprecated. |
| `sourcePath` | `string` | no |  | Repository-relative path to the declaration. |
| `sourceStartLine` | `number` | no | `0` | First line. Becomes the line anchor in the source link. |
| `sourceEndLine` | `number` | no | `0` | Last line of the declaration. |
| `sourceRef` | `string` | no |  | Branch or tag. Defaults to the page's synchronised ref. |
<!-- /docspress:block -->

## Examples

A filter, with provenance and a `since` version:

<!-- docspress:block
{
  "version": 1,
  "name": "docspress/symbol",
  "attrs": {
    "kind": "hook",
    "name": "mantle_core_modules",
    "signature": "apply_filters( 'mantle_core_modules', array $modules )",
    "language": "php",
    "summary": "\u003cp\u003eFilter the registered module array before the loader initialises anything. Applied at the end of \u003ccode\u003eregister_core_modules()\u003c/code\u003e.\u003c/p\u003e",
    "parameters": [
      {
        "name": "$modules",
        "type": "array",
        "required": true,
        "defaultValue": "",
        "description": "Modules keyed by identifier."
      }
    ],
    "returns": "\u003cp\u003eThe filtered module array. Returning a non-array is ignored.\u003c/p\u003e",
    "throws": "",
    "since": "2.4.0",
    "deprecated": "",
    "sourcePath": "includes/Core/Modules.php",
    "sourceStartLine": 212,
    "sourceEndLine": 0,
    "sourceRef": ""
  }
}
-->
#### hook `mantle_core_modules`

_Since 2.4.0._

Filter the registered module array before the loader initialises anything. Applied at the end of `register_core_modules()`.

```php
apply_filters( 'mantle_core_modules', array $modules )
```

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `$modules` | `array` | yes |  | Modules keyed by identifier. |

**Returns** — The filtered module array. Returning a non-array is ignored.

_Source: includes/Core/Modules.php:212_
<!-- /docspress:block -->

A CLI command, where the parameters are arguments and flags:

<!-- docspress:block
{
  "version": 1,
  "name": "docspress/symbol",
  "attrs": {
    "kind": "command",
    "name": "wp mantle cache clear",
    "signature": "wp mantle cache clear [\u003ctarget\u003e] [\u002d\u002dall] [\u002d\u002dporcelain]",
    "language": "bash",
    "summary": "\u003cp\u003eClear one cache layer, or every layer the host exposes.\u003c/p\u003e",
    "parameters": [
      {
        "name": "\u003ctarget\u003e",
        "type": "string",
        "required": false,
        "defaultValue": "page",
        "description": "Layer to clear: \u003ccode\u003epage\u003c/code\u003e, \u003ccode\u003eobject\u003c/code\u003e, or \u003ccode\u003eedge\u003c/code\u003e."
      },
      {
        "name": "\u002d\u002dall",
        "type": "flag",
        "required": false,
        "defaultValue": "",
        "description": "Clear every layer. Overrides \u003ccode\u003e\u0026lt;target\u0026gt;\u003c/code\u003e."
      },
      {
        "name": "\u002d\u002dporcelain",
        "type": "flag",
        "required": false,
        "defaultValue": "",
        "description": "Print only the number of layers cleared."
      }
    ],
    "returns": "\u003cp\u003eExit code \u003ccode\u003e0\u003c/code\u003e on success, \u003ccode\u003e1\u003c/code\u003e when a layer refused to clear.\u003c/p\u003e",
    "throws": "",
    "since": "",
    "deprecated": "",
    "sourcePath": "includes/CLI/Cache.php",
    "sourceStartLine": 31,
    "sourceEndLine": 88,
    "sourceRef": ""
  }
}
-->
#### command `wp mantle cache clear`

Clear one cache layer, or every layer the host exposes.

```bash
wp mantle cache clear [<target>] [--all] [--porcelain]
```

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `<target>` | `string` | no | `page` | Layer to clear: `page`, `object`, or `edge`. |
| `--all` | `flag` | no |  | Clear every layer. Overrides `<target>`. |
| `--porcelain` | `flag` | no |  | Print only the number of layers cleared. |

**Returns** — Exit code `0` on success, `1` when a layer refused to clear.

_Source: includes/CLI/Cache.php:31-88_
<!-- /docspress:block -->

A deprecated function, with the replacement named:

<!-- docspress:block
{
  "version": 1,
  "name": "docspress/symbol",
  "attrs": {
    "kind": "function",
    "name": "mantle_get_module",
    "signature": "mantle_get_module( string $module_id ): ?Abstract_Module",
    "language": "php",
    "summary": "\u003cp\u003eFetch a registered module instance by identifier.\u003c/p\u003e",
    "parameters": [
      {
        "name": "$module_id",
        "type": "string",
        "required": true,
        "defaultValue": "",
        "description": "Module identifier, for example \u003ccode\u003emonitoring\u003c/code\u003e."
      }
    ],
    "returns": "\u003cp\u003eThe module, or \u003ccode\u003enull\u003c/code\u003e when no module owns that identifier.\u003c/p\u003e",
    "throws": "",
    "since": "",
    "deprecated": "Use Module_Loader::get() instead. Removed in 4.0.",
    "sourcePath": "includes/functions.php",
    "sourceStartLine": 140,
    "sourceEndLine": 152,
    "sourceRef": ""
  }
}
-->
#### function `mantle_get_module`

> [!CAUTION]
> Use Module\_Loader::get() instead. Removed in 4.0.

Fetch a registered module instance by identifier.

```php
mantle_get_module( string $module_id ): ?Abstract_Module
```

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `$module_id` | `string` | yes |  | Module identifier, for example `monitoring`. |

**Returns** — The module, or `null` when no module owns that identifier.

_Source: includes/functions.php:140-152_
<!-- /docspress:block -->
