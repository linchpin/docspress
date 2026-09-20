import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const blocks = path.join(root, "plugins/docspress-blocks");

function read(...parts) {
  return fs.readFileSync(path.join(blocks, ...parts), "utf8");
}

describe("Pages List module", () => {
  it("boots through the DocsPress Blocks module loader", () => {
    const bootstrap = read("docspress-blocks.php");
    const modules = read("includes/modules.php");
    const loader = read("includes/Modules/Module_Loader.php");

    expect(bootstrap).toContain("includes/modules.php");
    expect(bootstrap).not.toContain("includes/pages-list.php");
    expect(modules).toContain("Module_Loader");
    expect(loader).toContain("Pages_List_Module");
    expect(loader).toContain("docspress_blocks_register_modules");
  });

  it("lives under includes/Modules/Pages_List like a Mantle module", () => {
    for (const file of [
      "Pages_List_Module.php",
      "Settings.php",
      "List_Screen.php",
      "REST_Controller.php"
    ]) {
      expect(
        fs.existsSync(path.join(blocks, "includes/Modules/Pages_List", file))
      ).toBe(true);
    }
  });

  it("keeps the enable toggle on Settings → DocsPress", () => {
    const module = read("includes/Modules/Pages_List/Pages_List_Module.php");
    const settings = read("includes/Modules/Pages_List/Settings.php");
    const versioning = read("includes/versioning.php");
    expect(module).toContain("docspress_modern_pages_list");
    expect(settings).toContain("docspress_versions_settings_fields");
    expect(versioning).toContain("do_action( 'docspress_versions_settings_fields' )");
  });

  it("ships JS under src/modules/pages-list", () => {
    const app = read("src/modules/pages-list/app.js");
    const fields = read("src/modules/pages-list/fields.js");
    const webpack = read("webpack.config.js");

    expect(app).toContain("showLevels");
    expect(app).toContain("visiblePages");
    expect(fields).toContain("Docs version");
    expect(fields).toContain("GitHub path");
    expect(webpack).toContain("src/modules/pages-list/index.js");
  });

  it("keeps trashed pages out of the documentation tree", () => {
    const rest = read("includes/Modules/Pages_List/REST_Controller.php");
    expect(rest).toContain("excluded_statuses");
    expect(rest).toContain(
      "'post_status'            => array( 'publish', 'draft', 'pending', 'private', 'future' )"
    );
    expect(rest).not.toContain("'future', 'trash' )");
  });

  it("only offers sorting once the view is flattened", () => {
    const app = read("src/modules/pages-list/app.js");
    const fields = read("src/modules/pages-list/fields.js");

    // A sort indicator on a tree the table does not reorder reads as broken.
    expect(app).not.toMatch(/sort:\s*\{/);
    expect(app).toContain("getFields( { config, expanded, onToggle, searching } )");
    expect(fields).toContain("enableSorting: searching");
    expect(fields).not.toContain("enableSorting: true");
  });

  it("ships a built pages-list asset", () => {
    expect(fs.existsSync(path.join(blocks, "build/pages-list.asset.php"))).toBe(
      true
    );
    expect(fs.existsSync(path.join(blocks, "build/pages-list.js"))).toBe(true);
    expect(
      fs.existsSync(path.join(blocks, "build/style-pages-list.css"))
    ).toBe(true);
  });
});
