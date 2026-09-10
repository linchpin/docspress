// Fence info-string parsing.
//
// A bare fence stays a `core/code` block: that is the portable thing, it needs no plugin, and
// changing it would rewrite every existing page. A fence that carries any of the metadata
// below is asking for something `core/code` cannot express — a filename, highlighted lines,
// a caption, a diff, a line origin — so it becomes `docspress/colorful-code` instead.
//
//   ```php title="includes/Core/Bootstrap.php" lines="88-104" {3,7} copy=final
//
// The language itself is deliberately not a trigger. `core/code` carries the language as a
// `language-*` class, and promoting every fence would make the DocsPress Blocks plugin a hard
// requirement for any repository that writes a code sample.

// Aliases readers actually type, mapped onto the names the block renders. Without this a
// ```ts fence silently renders as plaintext, because the plugin's allow-list only knows
// `typescript`. Normalising at authoring time keeps the surprise out of the published page.
const LANGUAGE_ALIASES = {
  "c++": "cpp",
  "console": "bash",
  "js": "javascript",
  "md": "markdown",
  "node": "javascript",
  "sh": "bash",
  "shell-session": "bash",
  "text": "plaintext",
  "ts": "typescript",
  "txt": "plaintext",
  "yml": "yaml",
  "zsh": "bash"
};

// `key="value"`, `key=value`, `{1,3-5}`, or a bare `flag`.
const TOKEN_PATTERN = /(\{[^}]*\})|([\w-]+)=("([^"]*)"|'([^']*)'|[^\s]*)|([\w-]+)/g;

const LINE_RANGE_PATTERN = /^(\d+)(?:\s*-\s*(\d+))?$/;

export function normalizeLanguage(language) {
  const value = String(language || "").trim().toLowerCase();
  return LANGUAGE_ALIASES[value] || value;
}

// Returns { rawLanguage, language, attrs } where `attrs` is empty when the fence carries no
// metadata. An empty `attrs` is the caller's signal to keep the plain `core/code` path.
//
// `rawLanguage` is the author's tag verbatim and `language` is the alias-resolved form. They
// are kept apart on purpose: `core/code` round-trips through the `language-*` class, so
// rewriting the author's ```js to ```javascript there would churn the source file on every
// sync. Only the promoted block, whose allow-list actually rejects unknown names, normalises.
export function parseFenceInfo(info) {
  const raw = String(info || "").trim();
  if (!raw) {
    return { rawLanguage: "", language: "", attrs: {} };
  }

  const [languageToken, ...rest] = raw.split(/\s+/);
  const rawLanguage = languageToken || "";
  const language = normalizeLanguage(rawLanguage);
  const remainder = rest.join(" ");
  const attrs = {};

  let match;
  const pattern = new RegExp(TOKEN_PATTERN.source, "g");
  while ((match = pattern.exec(remainder))) {
    const [, braced, key, rawValue, doubleQuoted, singleQuoted, flag] = match;

    if (braced) {
      const lines = braced.slice(1, -1).trim();
      if (lines) {
        attrs.highlightedLines = lines;
      }
      continue;
    }

    if (key) {
      const value = doubleQuoted ?? singleQuoted ?? rawValue ?? "";
      applyPair(attrs, key.toLowerCase(), value);
      continue;
    }

    if (flag) {
      applyFlag(attrs, flag.toLowerCase());
    }
  }

  return { rawLanguage, language, attrs };
}

// Attribute values the block treats as "nothing was set". A reverse sync merges the block's
// defaults in before we get here, so without this every fence would come back carrying
// `diff=none copy=all linenumbers` noise that the author never wrote.
const FENCE_DEFAULTS = {
  filename: "",
  caption: "",
  highlightedLines: "",
  showLineNumbers: true,
  diffMode: "none",
  copyMode: "all"
};

// Attributes with no info-string spelling. A block carrying one of these cannot be written
// as a fence without losing it, so it stays an envelope.
const UNEXPRESSIBLE = ["annotations", "sourceRef"];

// The inverse of `parseFenceInfo`, used on the way back out of WordPress so a fence that was
// promoted on the way in returns as the same fence rather than as a verbose envelope.
//
// Returns null when the block cannot be represented losslessly. The check is not a
// hand-maintained list of what is safe — the formatted string is parsed back and compared,
// so anything that would not survive the round-trip falls through to the envelope by
// construction.
export function formatFenceInfo(language, attributes = {}) {
  const attrs = attributes || {};

  for (const key of UNEXPRESSIBLE) {
    const value = attrs[key];
    if (Array.isArray(value) ? value.length > 0 : Boolean(value)) {
      return null;
    }
  }

  const meaningful = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "code" || UNEXPRESSIBLE.includes(key)) {
      continue;
    }
    if (Object.hasOwn(FENCE_DEFAULTS, key) && value === FENCE_DEFAULTS[key]) {
      continue;
    }
    meaningful[key] = value;
  }

  const normalizedLanguage = normalizeLanguage(language || meaningful.language || "");
  delete meaningful.language;

  const tokens = [];
  if (meaningful.filename !== undefined) {
    tokens.push(`title=${quote(meaningful.filename)}`);
    delete meaningful.filename;
  }
  if (meaningful.sourceStartLine !== undefined) {
    const end = meaningful.sourceEndLine;
    tokens.push(`lines="${meaningful.sourceStartLine}${end !== undefined ? `-${end}` : ""}"`);
    delete meaningful.sourceStartLine;
    delete meaningful.sourceEndLine;
  }
  if (meaningful.highlightedLines !== undefined) {
    tokens.push(`{${meaningful.highlightedLines}}`);
    delete meaningful.highlightedLines;
  }
  if (meaningful.caption !== undefined) {
    tokens.push(`caption=${quote(meaningful.caption)}`);
    delete meaningful.caption;
  }
  if (meaningful.diffMode !== undefined) {
    tokens.push(`diff=${meaningful.diffMode}`);
    delete meaningful.diffMode;
  }
  if (meaningful.copyMode !== undefined) {
    tokens.push(`copy=${meaningful.copyMode}`);
    delete meaningful.copyMode;
  }
  if (meaningful.showLineNumbers !== undefined) {
    tokens.push(meaningful.showLineNumbers ? "linenumbers" : "nolinenumbers");
    delete meaningful.showLineNumbers;
  }

  // Anything left over has no spelling here — an attribute added to the block since this was
  // written, most likely. Keep the envelope rather than dropping it silently.
  if (Object.keys(meaningful).length > 0 || tokens.length === 0) {
    return null;
  }

  const info = [normalizedLanguage, ...tokens].filter(Boolean).join(" ");
  return roundTrips(info, normalizedLanguage, attrs) ? info : null;
}

function roundTrips(info, language, attrs) {
  const parsed = parseFenceInfo(info);
  if (parsed.language !== language) {
    return false;
  }

  // The stored language has to survive verbatim. A block holding `js` would come back as a
  // ```javascript fence, and the next forward sync would write `javascript` into WordPress —
  // a reverse sync rewriting content it was only meant to read. Keep the envelope instead.
  if (attrs.language !== undefined && attrs.language !== parsed.language) {
    return false;
  }

  const expected = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "code" || key === "language" || UNEXPRESSIBLE.includes(key)) {
      continue;
    }
    if (Object.hasOwn(FENCE_DEFAULTS, key) && value === FENCE_DEFAULTS[key]) {
      continue;
    }
    expected[key] = value;
  }

  return JSON.stringify(sortKeys(expected)) === JSON.stringify(sortKeys(parsed.attrs));
}

function sortKeys(value) {
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
}

// Values reaching here are filenames and captions, so a double quote is the only delimiter
// that needs escaping; a value carrying one falls back to single quotes.
function quote(value) {
  const text = String(value ?? "");
  return text.includes('"') ? `'${text}'` : `"${text}"`;
}

function applyPair(attrs, key, value) {
  switch (key) {
    case "title":
    case "filename":
      if (value) {
        attrs.filename = value;
      }
      return;
    case "caption":
      if (value) {
        attrs.caption = value;
      }
      return;
    case "highlight":
      if (value) {
        attrs.highlightedLines = value;
      }
      return;
    case "lines":
      applyLineRange(attrs, value);
      return;
    case "copy":
      if (value === "all" || value === "final") {
        attrs.copyMode = value;
      }
      return;
    case "diff":
      if (value === "unified" || value === "none") {
        attrs.diffMode = value;
      }
      return;
    case "linenumbers":
      attrs.showLineNumbers = value !== "false";
      return;
    default:
  }
}

function applyFlag(attrs, flag) {
  switch (flag) {
    case "diff":
      attrs.diffMode = "unified";
      return;
    case "linenumbers":
    case "showlinenumbers":
      attrs.showLineNumbers = true;
      return;
    case "nolinenumbers":
      attrs.showLineNumbers = false;
      return;
    default:
  }
}

// `lines="88-104"` records where the excerpt came from, so the rendered block can number from
// the real first line and link back to the range instead of implying the file starts here.
function applyLineRange(attrs, value) {
  const match = String(value || "").trim().match(LINE_RANGE_PATTERN);
  if (!match) {
    return;
  }

  const start = Number(match[1]);
  if (!Number.isSafeInteger(start) || start < 1) {
    return;
  }

  attrs.sourceStartLine = start;

  if (match[2] !== undefined) {
    const end = Number(match[2]);
    if (Number.isSafeInteger(end) && end >= start) {
      attrs.sourceEndLine = end;
    }
  }
}
