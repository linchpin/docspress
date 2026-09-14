import fs from "node:fs/promises";
import { parse as parseBlocks } from "@wordpress/block-serialization-default-parser";
import { describe, expect, it } from "vitest";
import {
  createSentinel,
  normalizeSentinelFormat,
  prependSentinel,
  readSentinel,
  sentinelFormat,
  stripSentinel
} from "../src/sentinel.js";

const body = "<!-- wp:paragraph -->\n<p>Hello</p>\n<!-- /wp:paragraph -->";
const record = { key: "docs/install", source: "docs/install.md", hash: "abc123" };

describe("sentinel", () => {
  it("writes a self-closing block whose payload round-trips", () => {
    const content = prependSentinel(body, record);

    expect(content.startsWith('<!-- wp:docspress/sentinel {"sentinel":')).toBe(true);
    expect(content).toContain('"lock":{"move":true,"remove":true}');
    expect(content).toContain("/-->");
    expect(readSentinel(content)).toEqual({ version: 1, ...record });
    expect(sentinelFormat(content)).toBe("block");
    expect(stripSentinel(content)).toBe(body);
  });

  it("escapes a payload that would otherwise close the comment early", () => {
    // A hash or a source path containing `--` ends an HTML comment, which truncates the record
    // and leaves the rest of the JSON as visible text on the Page.
    const content = createSentinel({ ...record, source: "docs/a--b.md" });

    expect(content).not.toContain("a--b");
    expect(content.match(/-->/g)).toHaveLength(1);
    expect(readSentinel(content).source).toBe("docs/a--b.md");
  });

  it("keeps the whole record, including keys added after the block was introduced", () => {
    const extended = { ...record, docsVersion: "v3", sidebarId: "api", futureKey: { nested: [1, 2] } };

    expect(readSentinel(prependSentinel(body, extended))).toEqual({ version: 1, ...extended });
  });

  it("reads and strips the legacy comment sentinel", () => {
    const content = prependSentinel(body, record, { format: "comment" });

    expect(content.startsWith("<!-- docspress:{")).toBe(true);
    expect(readSentinel(content)).toEqual({ version: 1, ...record });
    expect(sentinelFormat(content)).toBe("comment");
    expect(stripSentinel(content)).toBe(body);
  });

  it("reads a block the editor rewrote, including the paired spelling", () => {
    const attributes = JSON.stringify({ sentinel: { version: 1, ...record } });
    const selfClosing = `<!-- wp:docspress/sentinel ${attributes} /-->\n${body}`;
    const paired = `<!-- wp:docspress/sentinel ${attributes} -->\n<!-- /wp:docspress/sentinel -->\n${body}`;

    expect(readSentinel(selfClosing)).toEqual({ version: 1, ...record });
    expect(readSentinel(paired)).toEqual({ version: 1, ...record });
    expect(stripSentinel(paired)).toBe(body);
  });

  it("reports no sentinel for unmanaged content or a damaged record", () => {
    for (const content of [
      body,
      "",
      '<!-- wp:docspress/sentinel {"sentinel":{"version":2,"key":"docs"}} /-->',
      '<!-- wp:docspress/sentinel {"sentinel":{not json}} /-->',
      "<!-- wp:docspress/sentinel /-->"
    ]) {
      expect(readSentinel(content)).toBe(null);
      expect(sentinelFormat(content)).toBe(null);
    }
  });

  it("does not mistake another DocsPress block for the sentinel", () => {
    const content = '<!-- wp:docspress/symbol {"name":"docspress_sync"} /-->';

    expect(readSentinel(content)).toBe(null);
    expect(stripSentinel(content)).toBe(content);
  });

  it("parses as a block, which is the whole point: the comment spelling parses as freeform", () => {
    // WordPress has no block for a bare HTML comment, so it collects one into a freeform block
    // — the Classic block whose body is the raw record, and whose conversion to blocks turns
    // that record into visible text.
    const [legacy] = parseBlocks(prependSentinel(body, record, { format: "comment" }));
    expect(legacy.blockName).toBe(null);

    // The low-level parser emits the whitespace between two blocks as an empty freeform chunk.
    // The editor drops those; only the named blocks are what a reader sees.
    const blocks = parseBlocks(prependSentinel(body, record))
      .filter((block) => block.blockName || block.innerHTML.trim());
    expect(blocks.map(({ blockName }) => blockName)).toEqual(["docspress/sentinel", "core/paragraph"]);
    expect(blocks[0].attrs.sentinel).toEqual({ version: 1, ...record });
    expect(blocks[0].attrs.lock).toEqual({ move: true, remove: true });
    expect(blocks[0].innerHTML).toBe("");
  });

  it("orders the attributes the way the block registers them", async () => {
    // The editor serializes a block's attributes in registration order. Emitting them in any
    // other order means the first time anyone saves a synced Page, the editor rewrites the
    // delimiter for no reason — a diff on every Page that says nothing changed.
    const blockPhp = await fs.readFile("plugins/docspress-blocks/blocks/sentinel/block.php", "utf8");
    const registered = [...blockPhp
      .slice(blockPhp.indexOf("'attributes'"), blockPhp.indexOf("'supports'"))
      .matchAll(/'(\w+)'\s*=>\s*array\(\s*'type'/g)].map((match) => match[1]);
    const emitted = Object.keys(JSON.parse(createSentinel(record).match(/\{[\s\S]*\}(?=\s\/-->)/)[0]));

    expect(registered).toEqual(["sentinel", "lock"]);
    expect(emitted).toEqual(registered);
  });

  it("rejects an unknown sentinel-format rather than silently writing a comment", () => {
    expect(normalizeSentinelFormat("")).toBe("block");
    expect(normalizeSentinelFormat("Comment")).toBe("comment");
    expect(() => normalizeSentinelFormat("html")).toThrow(/sentinel-format/);
  });
});
