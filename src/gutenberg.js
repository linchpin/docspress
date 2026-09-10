import { normalizeLanguage } from "./code-fence.js";
import { escapeAttribute, escapeHtml, safeJson } from "./utils.js";

const VOID_BLOCKS = new Set(["core/more", "core/nextpage"]);

// Dynamic blocks render from their attributes and carry no saved markup, so they serialize
// as a single self-closing comment. This is the one place that shape is emitted — the
// DocsPress plugin blocks and core's void blocks both come through here.
export function selfClosingBlock(name, attrs) {
  const serializedAttrs = attrs && Object.keys(attrs).length > 0 ? ` ${safeJson(attrs)}` : "";
  return `<!-- wp:${name.replace(/^core\//, "")}${serializedAttrs} /-->`;
}

export function serializeBlock(name, attrs, html) {
  if (VOID_BLOCKS.has(name)) {
    return selfClosingBlock(name, attrs);
  }

  const serializedAttrs = attrs && Object.keys(attrs).length > 0 ? ` ${JSON.stringify(attrs)}` : "";
  return `<!-- wp:${name.replace(/^core\//, "")}${serializedAttrs} -->\n${html}\n<!-- /wp:${name.replace(/^core\//, "")} -->`;
}

export function paragraphBlock(html) {
  return serializeBlock("core/paragraph", null, `<p>${html}</p>`);
}

export function headingBlock(level, html) {
  const safeLevel = Math.min(Math.max(Number(level) || 2, 1), 6);
  const attrs = safeLevel === 2 ? null : { level: safeLevel };
  return serializeBlock("core/heading", attrs, `<h${safeLevel}>${html}</h${safeLevel}>`);
}

export function listBlock(html, ordered = false) {
  const tag = ordered ? "ol" : "ul";
  const attrs = ordered ? { ordered: true } : null;
  return serializeBlock("core/list", attrs, `<${tag}>${html}</${tag}>`);
}

export function quoteBlock(html) {
  return serializeBlock("core/quote", null, `<blockquote class="wp-block-quote">${html}</blockquote>`);
}

export function codeBlock(value, lang) {
  const className = lang ? ` class="language-${escapeAttribute(lang)}"` : "";
  return serializeBlock("core/code", null, `<pre class="wp-block-code"><code${className}>${escapeHtml(value)}</code></pre>`);
}

// `docspress/colorful-code` is dynamic: the source lives in the `code` attribute rather than
// in saved markup, which is why the language survives an editor round-trip here and does not
// on `core/code`.
export function colorfulCodeBlock(value, language, attrs = {}) {
  return selfClosingBlock("docspress/colorful-code", {
    ...(language ? { language } : {}),
    ...attrs,
    code: String(value ?? "")
  });
}

export function calloutBlock(attrs) {
  return selfClosingBlock("docspress/callout", attrs);
}

export function codetabsBlock(tabs) {
  const normalized = (tabs || []).slice(0, 8).map((tab, index) => ({
    label: String(tab.label || `Tab ${index + 1}`),
    language: normalizeLanguage(tab.language || ""),
    filename: String(tab.filename || ""),
    code: String(tab.code ?? "")
  }));

  if (normalized.length === 0) {
    return "";
  }

  return selfClosingBlock("docspress/code-tabs", { tabs: normalized });
}

export function preformattedBlock(value) {
  return serializeBlock("core/preformatted", null, `<pre class="wp-block-preformatted">${escapeHtml(value)}</pre>`);
}

export function separatorBlock() {
  return serializeBlock("core/separator", null, '<hr class="wp-block-separator has-alpha-channel-opacity"/>');
}

export function htmlBlock(value) {
  return serializeBlock("core/html", null, String(value || ""));
}

export function imageBlock(node) {
  const url = node.url || "";
  const alt = node.alt || "";
  const title = node.title || "";
  const attrs = { url, alt };
  const caption = title ? `<figcaption class="wp-element-caption">${escapeHtml(title)}</figcaption>` : "";
  return serializeBlock(
    "core/image",
    attrs,
    `<figure class="wp-block-image"><img src="${escapeAttribute(url)}" alt="${escapeAttribute(alt)}"/>${caption}</figure>`
  );
}

export function tableBlock(html) {
  return serializeBlock("core/table", null, `<figure class="wp-block-table"><table>${html}</table></figure>`);
}

export function sourceLinkBlock(url, label = "Edit this page on GitHub") {
  return serializeBlock(
    "core/paragraph",
    { className: "docspress-source-link" },
    `<p class="docspress-source-link"><a href="${escapeAttribute(url)}">${escapeHtml(label)}</a></p>`
  );
}
