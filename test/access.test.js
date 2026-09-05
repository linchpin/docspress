import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { syncBidirectional } from "../src/bidirectional.js";
import { collectDesiredPages, normalizeAccessTier, normalizeClientSlugs } from "../src/docs.js";
import { hashPageState } from "../src/page-state.js";
import { prependSentinel } from "../src/sentinel.js";
import { syncPages } from "../src/sync.js";

function desiredPage(key, overrides = {}) {
  const segments = key.split("/");
  const hash = overrides.hash || `${key}-hash`;
  const sentinel = { key, source: `docs/${key}.md`, hash };

  return {
    key,
    parentKey: segments.length > 1 ? segments.slice(0, -1).join("/") : null,
    slug: segments.at(-1),
    title: key,
    status: "publish",
    hash,
    content: prependSentinel("<p>Managed page</p>", sentinel),
    depth: segments.length,
    access: "",
    clientSlugs: [],
    accessManagedBy: "",
    ...overrides
  };
}

function existingPage(id, key, options = {}) {
  const hash = options.hash || `${key}-hash`;

  return {
    id,
    slug: key.split("/").at(-1),
    parent: options.parent || 0,
    menuOrder: 0,
    content: prependSentinel("<p>Managed page</p>", { key, source: `docs/${key}.md`, hash }),
    title: key,
    status: "publish",
    meta: options.meta || {},
    terms: options.terms || {}
  };
}

function mockClient(pages = [], terms = []) {
  const calls = [];
  let nextId = 100;

  return {
    calls,
    async listPages() {
      return pages;
    },
    async listTerms() {
      return terms;
    },
    async createPage(payload) {
      calls.push(["create", payload]);
      return { id: (nextId += 1), ...payload };
    },
    async updatePage(id, payload) {
      calls.push(["update", id, payload]);
      return { id, ...payload };
    },
    async deletePage(id, options) {
      calls.push(["delete", id, options]);
      return { id, deleted: true };
    }
  };
}

const ACME = { id: 77, name: "Acme", slug: "acme", count: 0, meta: {} };

describe("access input normalization", () => {
  it("accepts the four tiers and rejects anything else", () => {
    expect(normalizeAccessTier("internal")).toBe("internal");
    expect(normalizeAccessTier(" Client ")).toBe("client");
    expect(normalizeAccessTier("")).toBe("");
    expect(() => normalizeAccessTier("private")).toThrow(/expected one of/);
  });

  it("parses client slugs from a list or a comma separated string", () => {
    expect(normalizeClientSlugs("acme, globex")).toEqual(["acme", "globex"]);
    expect(normalizeClientSlugs(["acme", "acme"])).toEqual(["acme"]);
    expect(normalizeClientSlugs("")).toEqual([]);
    expect(() => normalizeClientSlugs("Acme Corp")).toThrow(/not a valid client slug/);
  });
});

describe("access precedence", () => {
  async function collect(markdown, options = {}) {
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "docspress-access-"));
    await fs.mkdir(path.join(cwd, "docs"), { recursive: true });
    await fs.writeFile(path.join(cwd, "docs", "index.md"), "# Docs\n\nRoot.");
    await fs.writeFile(path.join(cwd, "docs", "page.md"), markdown);

    const pages = await collectDesiredPages({
      cwd,
      docsDir: "docs",
      rootSlug: "docs",
      rootTitle: "Docs",
      status: "publish",
      ...options
    });

    return pages.find((page) => page.key === "docs/page");
  }

  it("uses the repository input when the page says nothing", async () => {
    const page = await collect("# Page\n\nBody.", { access: "internal" });

    expect(page.access).toBe("internal");
    expect(page.accessManagedBy).toBe("repo");
    expect(page.clientSlugs).toEqual([]);
  });

  it("lets page frontmatter override the repository input", async () => {
    const page = await collect(
      "---\naccess: client\nclients: [acme, globex]\n---\n\n# Page\n\nBody.",
      { access: "internal" }
    );

    expect(page.access).toBe("client");
    expect(page.accessManagedBy).toBe("frontmatter");
    expect(page.clientSlugs).toEqual(["acme", "globex"]);
  });

  it("leaves access unmanaged when neither source sets it", async () => {
    const page = await collect("# Page\n\nBody.");

    expect(page.access).toBe("");
    expect(page.accessManagedBy).toBe("");
  });

  it("refuses client frontmatter with no clients", async () => {
    await expect(collect("---\naccess: client\n---\n\n# Page\n\nBody."))
      .rejects.toThrow(/requires at least one client slug/);
  });
});

describe("syncPages access handling", () => {
  it("writes the tier, the managed marker and the client term", async () => {
    const client = mockClient([], [ACME]);

    await syncPages({
      desiredPages: [desiredPage("docs", { access: "client", clientSlugs: ["acme"], accessManagedBy: "repo" })],
      client,
      rootSlug: "docs",
      logger: { info() {} }
    });

    const [, payload] = client.calls.find(([action]) => action === "create");

    expect(payload.meta._docs_access).toBe("client");
    expect(payload.meta._docs_access_managed).toBe("repo");
    expect(payload.docs_client).toEqual([77]);
  });

  it("does not touch access or the client taxonomy for an unmanaged run", async () => {
    const client = mockClient([], []);

    await syncPages({
      desiredPages: [desiredPage("docs")],
      client,
      rootSlug: "docs",
      clientTaxonomy: "",
      logger: { info() {} }
    });

    const [, payload] = client.calls.find(([action]) => action === "create");

    expect(payload.meta?._docs_access).toBeUndefined();
    expect(payload.meta?._docs_access_managed).toBeUndefined();
    expect(payload.docs_client).toBeUndefined();
  });

  it("detects an editor-panel override as drift and restores the repository tier", async () => {
    const existing = [
      existingPage(1, "docs", {
        meta: { _docs_access: "public", _docs_access_managed: "repo" },
        terms: { docs_client: [] }
      })
    ];
    const client = mockClient(existing, [ACME]);

    const result = await syncPages({
      desiredPages: [desiredPage("docs", { access: "internal", accessManagedBy: "repo" })],
      client,
      rootSlug: "docs",
      logger: { info() {} }
    });

    expect(result.updated).toBe(1);

    const [, , payload] = client.calls.find(([action]) => action === "update");

    expect(payload.meta._docs_access).toBe("internal");
  });

  it("leaves a matching repository-managed page alone", async () => {
    const existing = [
      existingPage(1, "docs", {
        meta: { _docs_access: "internal", _docs_access_managed: "repo" },
        terms: { docs_client: [] }
      })
    ];
    const client = mockClient(existing, [ACME]);

    const result = await syncPages({
      desiredPages: [desiredPage("docs", { access: "internal", accessManagedBy: "repo" })],
      client,
      rootSlug: "docs",
      logger: { info() {} }
    });

    expect(result.unchanged).toBe(1);
    expect(client.calls).toEqual([]);
  });

  it("hands access back to the editor panel when the repository stops managing it", async () => {
    const existing = [
      existingPage(1, "docs", {
        meta: { _docs_access: "internal", _docs_access_managed: "repo" },
        terms: { docs_client: [] }
      })
    ];
    const client = mockClient(existing, []);

    const result = await syncPages({
      desiredPages: [desiredPage("docs")],
      client,
      rootSlug: "docs",
      logger: { info() {} }
    });

    expect(result.updated).toBe(1);

    const [, , payload] = client.calls.find(([action]) => action === "update");

    // The marker clears; the last tier is deliberately left in place so a
    // restricted page never silently reverts to public.
    expect(payload.meta._docs_access_managed).toBe("");
    expect(payload.meta._docs_access).toBeUndefined();
  });

  it("fails loudly rather than publishing docs scoped to a client that does not exist", async () => {
    const client = mockClient([], []);

    await expect(syncPages({
      desiredPages: [desiredPage("docs", { access: "client", clientSlugs: ["nope"], accessManagedBy: "repo" })],
      client,
      rootSlug: "docs",
      logger: { info() {} }
    })).rejects.toThrow(/Unknown documentation client/);
  });
});

describe("reverse sync safety", () => {
  const paragraph = (text) => `<!-- wp:paragraph -->\n<p>${text}</p>\n<!-- /wp:paragraph -->`;

  function reversePage(text = "Base") {
    const page = {
      key: "docs",
      sourcePath: "docs/index.md",
      sourceMarkdown: `# Docs\n\n${text}\n`,
      title: "Docs",
      titleOverride: "",
      slug: "docs",
      parentKey: null,
      status: "publish",
      body: paragraph(text),
      depth: 1
    };
    page.hash = hashPageState(page);
    page.content = prependSentinel(page.body, { key: page.key, source: page.sourcePath, hash: page.hash });
    return page;
  }

  function livePage(base, text, meta = {}) {
    return {
      id: 1,
      slug: base.slug,
      parent: 0,
      title: base.title,
      status: base.status,
      meta,
      content: prependSentinel(paragraph(text), { key: base.key, source: base.sourcePath, hash: base.hash }),
      link: `https://example.com/${base.slug}/`
    };
  }

  async function run(meta) {
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "docspress-reverse-access-"));
    await fs.mkdir(path.join(cwd, "docs"));
    await fs.writeFile(path.join(cwd, "docs", "index.md"), "# Docs\n\nBase\n");

    const desired = reversePage();
    const githubClient = { syncChanges: async () => ({ number: 4, url: "https://example.test/pull/4", status: "created" }) };
    const warnings = [];

    const result = await syncBidirectional({
      mode: "propose",
      desiredPages: [desired],
      client: mockClient([livePage(desired, "Edited in WordPress", meta)]),
      githubClient,
      cwd,
      logger: { info() {}, warning: (message) => warnings.push(message) }
    });

    return { result, warnings };
  }

  it("proposes a WordPress-only edit on a public page", async () => {
    const { result, warnings } = await run({});

    expect(result.proposed).toBe(1);
    expect(warnings).toEqual([]);
  });

  it("withholds the edit when WordPress marks the page internal", async () => {
    const { result, warnings } = await run({ _docs_access: "internal", _docs_access_managed: "repo" });

    expect(result.proposed).toBe(0);
    expect(warnings.join(" ")).toMatch(/Withholding docs/);
  });

  it("withholds the edit when the page is scoped to a client", async () => {
    const { result } = await run({ _docs_access: "client" });

    expect(result.proposed).toBe(0);
  });
});
