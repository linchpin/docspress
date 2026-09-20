# DocsPress Blocks modules

Feature modules live under `includes/Modules/` (PHP) and `src/modules/` (JS), following the same shape as Mantle: a small loader, an abstract base, and one folder per feature that can be toggled from **Settings → DocsPress**.

## Built-in

| Module | Id | Purpose |
| --- | --- | --- |
| `Pages_List` | `pages_list` | Hierarchical DataViews Pages admin list for deep documentation trees |

## Extending

Hook `docspress_blocks_register_modules` and call `$loader->register( $module )` with a class that implements `DocsPressBlocks\Modules\Module_Interface`.
