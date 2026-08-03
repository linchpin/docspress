import { stripTrailingSlash } from "./utils.js";

const EDITABLE_PAGE_STATUSES = ["publish", "future", "draft", "pending", "private"];

export class WordPressClient {
  constructor(options) {
    this.baseUrl = stripTrailingSlash(options.baseUrl || "https://public-api.wordpress.com");
    this.site = options.site;
    this.token = options.token;
    this.fetchImpl = options.fetchImpl || fetch;
    this.taxonomies = options.taxonomies || [];
  }

  restEndpoint(collection) {
    const restCollection = String(collection || "").replace(/^\/+|\/+$/g, "");

    if (this.baseUrl.includes("public-api.wordpress.com")) {
      if (!this.site) {
        throw new Error("wordpress-site is required for WordPress.com API requests.");
      }
      return `${this.baseUrl}/wp/v2/sites/${encodeURIComponent(this.site)}/${restCollection}`;
    }

    return `${this.baseUrl}/wp-json/wp/v2/${restCollection}`;
  }

  pagesEndpoint() {
    return this.restEndpoint("pages");
  }

  async listPages() {
    const pagesById = new Map();

    // WordPress exposes `any` in the REST schema, but some WordPress.com and
    // Atomic sites reject it during capability checks. Query each writable
    // Page status explicitly so drafts and scheduled or private Pages remain
    // visible without relying on that shortcut.
    for (const status of EDITABLE_PAGE_STATUSES) {
      let page = 1;
      let totalPages = 1;

      do {
        const response = await this.request("GET", this.pagesEndpoint(), {
          query: {
            per_page: "100",
            page: String(page),
            context: "edit",
            status
          }
        });

        for (const pageData of response.data) {
          const id = pageData.id ?? pageData.ID;
          pagesById.set(id, pageData);
        }

        totalPages = Number(response.headers.get("x-wp-totalpages") || totalPages || 1);
        page += 1;
      } while (page <= totalPages);
    }

    return Array.from(pagesById.values(), (pageData) => normalizePage(pageData, this.taxonomies));
  }

  async createPage(payload) {
    const response = await this.request("POST", this.pagesEndpoint(), { body: payload });
    return normalizePage(response.data, this.taxonomies);
  }

  async updatePage(id, payload) {
    const response = await this.request("POST", `${this.pagesEndpoint()}/${id}`, { body: payload });
    return normalizePage(response.data, this.taxonomies);
  }

  async deletePage(id, options = {}) {
    const response = await this.request("DELETE", `${this.pagesEndpoint()}/${id}`, {
      query: options.force ? { force: "true" } : {}
    });
    return response.data;
  }

  termsEndpoint(taxonomy) {
    return this.restEndpoint(taxonomy);
  }

  async listTerms(taxonomy) {
    const terms = [];
    let page = 1;
    let totalPages = 1;

    do {
      const response = await this.request("GET", this.termsEndpoint(taxonomy), {
        query: {
          per_page: "100",
          page: String(page),
          context: "edit",
          hide_empty: "false"
        }
      });
      terms.push(...response.data);
      totalPages = Number(response.headers.get("x-wp-totalpages") || totalPages || 1);
      page += 1;
    } while (page <= totalPages);

    return terms.map(normalizeTerm);
  }

  async createTerm(taxonomy, payload) {
    const response = await this.request("POST", this.termsEndpoint(taxonomy), { body: payload });
    return normalizeTerm(response.data);
  }

  async updateTerm(taxonomy, id, payload) {
    const response = await this.request("POST", `${this.termsEndpoint(taxonomy)}/${id}`, { body: payload });
    return normalizeTerm(response.data);
  }

  async getSettings() {
    const response = await this.request("GET", this.restEndpoint("settings"), {
      query: { context: "edit" }
    });
    return response.data || {};
  }

  async updateSettings(payload) {
    const response = await this.request("POST", this.restEndpoint("settings"), { body: payload });
    return response.data || {};
  }

  async request(method, url, options = {}) {
    const requestUrl = new URL(url);
    for (const [key, value] of Object.entries(options.query || {})) {
      requestUrl.searchParams.set(key, value);
    }

    const headers = {
      Accept: "application/json"
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const init = {
      method,
      headers
    };

    if (options.body) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const response = await this.fetchImpl(requestUrl, init);
    const text = await response.text();

    // Parse defensively. Anything in front of WordPress — a CDN challenge, a
    // WAF block, a PHP fatal — answers with HTML, and letting JSON.parse throw
    // here would discard the status and body that identify the responder.
    let data = null;
    let parsed = true;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        parsed = false;
      }
    }

    if (!response.ok) {
      throw new Error(formatApiError(data, method, requestUrl, response.status, parsed ? null : text, response));
    }

    if (!parsed) {
      throw new Error(
        `${method} ${requestUrl} returned HTTP ${response.status} with a non-JSON body. ${describeBody(text, response)}`
      );
    }

    return {
      data,
      headers: response.headers
    };
  }
}

function formatApiError(data, method, requestUrl, status, rawBody, response) {
  const message = data?.message || data?.error
    || (rawBody
      ? `${method} ${requestUrl} failed with HTTP ${status}. ${describeBody(rawBody, response)}`
      : `${method} ${requestUrl} failed with HTTP ${status}`);

  if (String(message).includes("Required scope: `global`")) {
    return `${message} Regenerate WP_ACCESS_TOKEN with the Docspress token helper so it requests the WordPress.com "global" OAuth scope.`;
  }

  // A hosting WAF can reject the request body before WordPress ever sees it.
  // WordPress.com Atomic answers 406 with an HTML page, and the usual trigger
  // is a literal "../.." in documented file paths, which matches a path
  // traversal rule.
  if (status === 406 && rawBody) {
    return `${message} A hosting firewall rejected the request body before it reached WordPress. This usually means a page documents a literal "../.." path; rewrite those as repository-relative paths or a build alias.`;
  }

  return message;
}

const BODY_SNIPPET_LENGTH = 300;

function describeBody(text, response) {
  const contentType = response?.headers?.get?.("content-type") || "unknown";
  const snippet = String(text).replace(/\s+/g, " ").trim().slice(0, BODY_SNIPPET_LENGTH);
  const parts = [`Content-Type: ${contentType}.`];

  // Edge responses carry the identifiers support will ask for.
  for (const header of ["cf-ray", "x-ac", "server"]) {
    const value = response?.headers?.get?.(header);
    if (value) {
      parts.push(`${header}: ${value}.`);
    }
  }

  parts.push(`Body starts: ${snippet}`);
  return parts.join(" ");
}

export function normalizePage(page, taxonomies = []) {
  const id = page.id ?? page.ID;
  const rawContent = typeof page.content === "string" ? page.content : page.content?.raw ?? page.content?.rendered ?? "";
  const renderedTitle = typeof page.title === "string" ? page.title : page.title?.raw ?? page.title?.rendered ?? "";
  const parent = typeof page.parent === "number" ? page.parent : page.parent?.ID ?? page.parent?.id ?? 0;
  const menuOrder = page.menu_order ?? page.menuOrder ?? 0;
  const terms = {};
  for (const taxonomy of taxonomies) {
    terms[taxonomy] = Array.isArray(page[taxonomy]) ? page[taxonomy].map(Number) : [];
  }

  return {
    id,
    slug: page.slug,
    parent,
    menuOrder,
    title: renderedTitle,
    content: rawContent,
    status: page.status,
    link: page.link ?? page.URL ?? "",
    meta: page.meta && typeof page.meta === "object" ? page.meta : {},
    terms
  };
}

export function normalizeTerm(term) {
  return {
    id: Number(term.id ?? term.ID),
    name: String(term.name || ""),
    slug: String(term.slug || ""),
    count: Number(term.count || 0),
    meta: term.meta && typeof term.meta === "object" ? term.meta : {}
  };
}
