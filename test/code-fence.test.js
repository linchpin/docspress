import { describe, expect, it } from "vitest";
import { formatFenceInfo, parseFenceInfo } from "../src/code-fence.js";
import { markdownToBlocks } from "../src/markdown.js";
import { blocksToMarkdown } from "../src/reverse.js";

function firstBlockAttrs(markdown) {
  const match = markdown.match(/<!-- wp:docspress\/colorful-code (\{.*?\}) \/-->/s);
  if (!match) {
    return null;
  }
  return JSON.parse(match[1].replace(/\\u003c/g, "<").replace(/\\u003e/g, ">").replace(/\\u0026/g, "&"));
}

describe("fence info strings", () => {
  it("leaves a bare fence as core/code so no plugin is required", () => {
    const result = markdownToBlocks("```php\necho 1;\n```\n", { fallbackTitle: "Docs" });

    expect(result.blocks).toContain("<!-- wp:code -->");
    expect(result.blocks).toContain('class="language-php"');
    expect(result.blocks).not.toContain("docspress/colorful-code");
  });

  it("keeps the author's language tag on core/code so a round-trip does not churn it", () => {
    const result = markdownToBlocks("```ts\nconst x = 1;\n```\n", { fallbackTitle: "Docs" });

    expect(result.blocks).toContain('class="language-ts"');
  });

  it("promotes a fence carrying metadata to docspress/colorful-code", () => {
    const result = markdownToBlocks(
      '```php title="includes/Core/Bootstrap.php" lines="88-104" {3,7} copy=final\npublic function run() {}\n```\n',
      { fallbackTitle: "Docs" }
    );

    expect(result.blocks).toContain("<!-- wp:docspress/colorful-code ");
    expect(firstBlockAttrs(result.blocks)).toEqual({
      language: "php",
      filename: "includes/Core/Bootstrap.php",
      sourceStartLine: 88,
      sourceEndLine: 104,
      highlightedLines: "3,7",
      copyMode: "final",
      code: "public function run() {}"
    });
  });

  it("resolves a language alias only on the promoted block", () => {
    const result = markdownToBlocks('```ts title="client.ts"\nconst x = 1;\n```\n', { fallbackTitle: "Docs" });

    expect(firstBlockAttrs(result.blocks)?.language).toBe("typescript");
  });

  it("escapes source that would otherwise close the block comment", () => {
    const result = markdownToBlocks('```php title="a.php"\n$this->run(); // a -- b & <c>\n```\n', { fallbackTitle: "Docs" });

    expect(result.blocks).toContain("\\u002d\\u002d");
    expect(result.blocks).toContain("\\u003e");
    expect(result.blocks).not.toMatch(/-->\s*\S/);
  });

  it("round-trips a promoted fence back to the identical fence", () => {
    const source = '```php title="includes/Core/Bootstrap.php" lines="88-104" {3}\npublic function run() {\n    $this->boot();\n}\n```';
    const { blocks } = markdownToBlocks(source, { fallbackTitle: "Docs" });

    expect(blocksToMarkdown(blocks).trim()).toBe(source);
    expect(markdownToBlocks(blocksToMarkdown(blocks).trim(), { fallbackTitle: "Docs" }).blocks).toBe(blocks);
  });

  it("ignores a malformed line range rather than guessing", () => {
    expect(parseFenceInfo('php lines="bogus"').attrs).toEqual({});
  });

  it("keeps the envelope for attributes a fence cannot express", () => {
    expect(formatFenceInfo("php", { language: "php", filename: "a.php", annotations: [{ line: 2, content: "x" }] })).toBeNull();
    expect(formatFenceInfo("php", { language: "php", filename: "a.php", futureAttribute: "x" })).toBeNull();
  });

  it("keeps the envelope rather than rewriting a stored language alias", () => {
    // `js` is not in the block's allow-list, but rewriting it to `javascript` on the way out
    // would push a changed attribute back into WordPress on the next forward sync.
    expect(formatFenceInfo("js", { language: "js", filename: "index.js" })).toBeNull();
  });
});
