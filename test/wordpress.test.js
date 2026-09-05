import { describe, expect, it } from "vitest";
import { WordPressClient } from "../src/wordpress.js";

function jsonResponse(data, init = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    headers: {
      get(name) {
        return init.headers?.[name.toLowerCase()] || init.headers?.[name] || null;
      }
    },
    async text() {
      return JSON.stringify(data);
    }
  };
}

describe("WordPressClient", () => {
  it("uses the WordPress.com pages endpoint and bearer token", async () => {
    const calls = [];
    const client = new WordPressClient({
      baseUrl: "https://public-api.wordpress.com",
      site: "fkadev.blog",
      token: "token",
      fetchImpl: async (url, init) => {
        calls.push({ url: String(url), init });
        return jsonResponse([], { headers: { "x-wp-totalpages": "1" } });
      }
    });

    await client.listPages();

    expect(calls[0].url).toContain("https://public-api.wordpress.com/wp/v2/sites/fkadev.blog/pages");
    expect(calls[0].url).toContain("context=edit");
    expect(calls[0].init.headers.Authorization).toBe("Bearer token");
    expect(calls.map(({ url }) => new URL(url).searchParams.get("status"))).toEqual([
      "publish",
      "future",
      "draft",
      "pending",
      "private"
    ]);
    expect(calls.every(({ url }) => !url.includes("status=any"))).toBe(true);
  });

  it("paginates every status independently and deduplicates Pages by ID", async () => {
    const calls = [];
    const client = new WordPressClient({
      baseUrl: "https://public-api.wordpress.com",
      site: "fkadev.blog",
      token: "token",
      fetchImpl: async (url, init) => {
        calls.push({ url: String(url), init });
        const requestUrl = new URL(String(url));
        const status = requestUrl.searchParams.get("status");
        const page = requestUrl.searchParams.get("page");
        if (!["publish", "draft"].includes(status)) {
          return jsonResponse([], { headers: { "x-wp-totalpages": "1" } });
        }
        return jsonResponse([{
          id: Number(page),
          slug: `page-${page}`,
          parent: 0,
          menu_order: Number(page) * 10,
          content: { raw: "" },
          title: { raw: "" }
        }], {
          headers: { "x-wp-totalpages": "2" }
        });
      }
    });

    const pages = await client.listPages();

    expect(pages.map((page) => page.id)).toEqual([1, 2]);
    expect(pages.map((page) => page.menuOrder)).toEqual([10, 20]);
    expect(calls.map(({ url }) => {
      const requestUrl = new URL(url);
      return [
        requestUrl.searchParams.get("status"),
        requestUrl.searchParams.get("page")
      ];
    })).toEqual([
      ["publish", "1"],
      ["publish", "2"],
      ["future", "1"],
      ["draft", "1"],
      ["draft", "2"],
      ["pending", "1"],
      ["private", "1"]
    ]);
  });

  it("raises WordPress API errors", async () => {
    const client = new WordPressClient({
      baseUrl: "https://public-api.wordpress.com",
      site: "fkadev.blog",
      token: "bad-token",
      fetchImpl: async () => jsonResponse({ message: "Invalid token" }, { ok: false, status: 401 })
    });

    await expect(client.listPages()).rejects.toThrow("Invalid token");
  });

  it("adds a useful hint for WordPress.com global scope failures", async () => {
    const client = new WordPressClient({
      baseUrl: "https://public-api.wordpress.com",
      site: "fkadev.blog",
      token: "narrow-token",
      fetchImpl: async () => jsonResponse(
        { message: "That API call is not allowed for this account. Required scope: `global`. Granted scope(s): `posts,media`." },
        { ok: false, status: 403 }
      )
    });

    await expect(client.listPages()).rejects.toThrow(/Regenerate WP_ACCESS_TOKEN/);
  });

  it("reports status, edge headers, and a body snippet when an error response is not JSON", async () => {
    const client = new WordPressClient({
      baseUrl: "https://docs.example.test",
      site: "docs.example.test",
      token: "token",
      fetchImpl: async () => ({
        ok: false,
        status: 403,
        headers: {
          get(name) {
            return {
              "content-type": "text/html; charset=UTF-8",
              "cf-ray": "a2523780496d4fa8-EWR",
              server: "cloudflare"
            }[name.toLowerCase()] || null;
          }
        },
        async text() {
          return "<!DOCTYPE html><html><head><title>Attention Required</title></head><body>Blocked</body></html>";
        }
      })
    });

    await expect(client.listPages()).rejects.toThrow(/HTTP 403/);
    await expect(client.listPages()).rejects.toThrow(/text\/html/);
    await expect(client.listPages()).rejects.toThrow(/a2523780496d4fa8-EWR/);
    await expect(client.listPages()).rejects.toThrow(/Attention Required/);
  });

  it("explains the path traversal trigger behind a 406 firewall block", async () => {
    const client = new WordPressClient({
      baseUrl: "https://docs.example.test",
      site: "docs.example.test",
      token: "token",
      fetchImpl: async () => ({
        ok: false,
        status: 406,
        headers: { get: () => "text/html" },
        async text() {
          return "<!DOCTYPE html><html><body>406 Not Acceptable. Our sentries tell us that you should not be doing this.</body></html>";
        }
      })
    });

    await expect(client.listPages()).rejects.toThrow(/hosting firewall/);
    await expect(client.listPages()).rejects.toThrow(/\.\.\/\.\./);
  });

  it("reports a non-JSON body even when the response status is ok", async () => {
    const client = new WordPressClient({
      baseUrl: "https://docs.example.test",
      site: "docs.example.test",
      token: "token",
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        headers: { get: () => "text/html" },
        async text() {
          return "<!DOCTYPE html><html><body>surprise</body></html>";
        }
      })
    });

    await expect(client.listPages()).rejects.toThrow(/non-JSON body/);
  });

  it("still surfaces the WordPress message when an error response is valid JSON", async () => {
    const client = new WordPressClient({
      baseUrl: "https://public-api.wordpress.com",
      site: "fkadev.blog",
      token: "token",
      fetchImpl: async () => jsonResponse({ message: "Sorry, you are not allowed to do that." }, { ok: false, status: 403 })
    });

    await expect(client.listPages()).rejects.toThrow("Sorry, you are not allowed to do that.");
  });

  it("reads version taxonomy terms, Page metadata, and DocsPress settings", async () => {
    const calls = [];
    const client = new WordPressClient({
      baseUrl: "https://example.test",
      site: "ignored",
      token: "token",
      taxonomies: ["docspress_versions"],
      fetchImpl: async (url, init) => {
        calls.push([String(url), init]);
        const pathname = new URL(String(url)).pathname;
        if (pathname.endsWith("/docspress_versions")) {
          return jsonResponse([{
            id: 7,
            name: "Version 1",
            slug: "v1",
            count: 2,
            meta: { docspress_version_active: true }
          }], { headers: { "x-wp-totalpages": "1" } });
        }
        if (pathname.endsWith("/settings")) {
          return jsonResponse({
            docspress_repository_latest_version: "v2",
            docspress_version_override: "v1",
            docspress_docs_root_slug: "docs"
          });
        }
        return jsonResponse([{
          id: 12,
          slug: "hello",
          parent: 0,
          content: { raw: "Hello" },
          title: { raw: "Hello" },
          meta: { _docspress_version_id: "v1" },
          docspress_versions: [7]
        }], { headers: { "x-wp-totalpages": "1" } });
      }
    });

    const [pages, terms, settings] = await Promise.all([
      client.listPages(),
      client.listTerms("docspress_versions"),
      client.getSettings()
    ]);

    expect(pages[0]).toMatchObject({
      meta: { _docspress_version_id: "v1" },
      terms: { docspress_versions: [7] }
    });
    expect(terms[0]).toMatchObject({ id: 7, slug: "v1", count: 2 });
    expect(settings.docspress_version_override).toBe("v1");
    expect(calls.map(([url]) => url)).toEqual(expect.arrayContaining([
      "https://example.test/wp-json/wp/v2/docspress_versions?per_page=100&page=1&context=edit&hide_empty=false",
      "https://example.test/wp-json/wp/v2/settings?context=edit"
    ]));
  });
});
