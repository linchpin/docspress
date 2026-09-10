import { describe, expect, it } from "vitest";
import { markdownToBlocks } from "../src/markdown.js";
import { blocksToMarkdown } from "../src/reverse.js";

function calloutAttrs(markdown) {
  const match = markdown.match(/<!-- wp:docspress\/callout (\{.*?\}) \/-->/s);
  if (!match) {
    return null;
  }
  return JSON.parse(match[1].replace(/\\u003c/g, "<").replace(/\\u003e/g, ">").replace(/\\u0026/g, "&"));
}

describe("GitHub alerts", () => {
  it.each([
    ["NOTE", "note"],
    ["TIP", "tip"],
    ["WARNING", "warning"],
    ["CAUTION", "danger"]
  ])("maps [!%s] onto the %s callout tone", (type, tone) => {
    const { blocks } = markdownToBlocks(`> [!${type}]\n> Body text.\n`, { fallbackTitle: "Docs" });

    expect(calloutAttrs(blocks)).toEqual({
      tone,
      title: "",
      content: "<p>Body text.</p>"
    });
  });

  it("reads a leading bold paragraph as the callout title", () => {
    const { blocks } = markdownToBlocks(
      "> [!WARNING]\n> **Protect credentials**\n>\n> Store the token in a secret manager.\n",
      { fallbackTitle: "Docs" }
    );

    expect(calloutAttrs(blocks)).toEqual({
      tone: "warning",
      title: "Protect credentials",
      content: "<p>Store the token in a secret manager.</p>"
    });
  });

  it("leaves [!IMPORTANT] as a quote because no tone maps back to it", () => {
    const { blocks } = markdownToBlocks("> [!IMPORTANT]\n> Body text.\n", { fallbackTitle: "Docs" });

    expect(blocks).toContain("<!-- wp:quote -->");
    expect(blocks).not.toContain("docspress/callout");
  });

  it("leaves an ordinary quote alone", () => {
    const { blocks } = markdownToBlocks("> Just a quote.\n", { fallbackTitle: "Docs" });

    expect(blocks).toContain("<!-- wp:quote -->");
    expect(blocks).not.toContain("docspress/callout");
  });

  it("round-trips a converted alert through the envelope without drift", () => {
    const { blocks } = markdownToBlocks("> [!WARNING]\n> **Careful**\n>\n> Body text.\n", { fallbackTitle: "Docs" });
    const back = blocksToMarkdown(blocks);

    expect(markdownToBlocks(back, { fallbackTitle: "Docs" }).blocks).toBe(blocks);
  });
});
