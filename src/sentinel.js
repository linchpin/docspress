export const SENTINEL_PREFIX = "docspress:";
export const SENTINEL_BLOCK = "docspress/sentinel";
export const SENTINEL_FORMATS = ["block", "comment"];
export const DEFAULT_SENTINEL_FORMAT = "block";

// Locking the block keeps an editor from deleting the record that makes the Page manageable.
// Without it the next run finds an unmanaged Page on a managed path and reports a conflict
// instead of publishing, and nothing in the editor warns that the deletion did that.
const SENTINEL_LOCK = { move: true, remove: true };

const COMMENT_PATTERN = /<!--\s*docspress:(.*?)\s*-->/s;
const BLOCK_PATTERN = new RegExp(
  `<!--\\s+wp:${SENTINEL_BLOCK}(?:\\s+(\\{[\\s\\S]*?\\}))?\\s+(?:\\/-->|-->[\\s\\S]*?<!--\\s+\\/wp:${SENTINEL_BLOCK}\\s+-->)`
);

export function normalizeSentinelFormat(value) {
  const format = String(value || "").trim().toLowerCase();
  if (!format) {
    return DEFAULT_SENTINEL_FORMAT;
  }
  if (!SENTINEL_FORMATS.includes(format)) {
    throw new Error(`Invalid sentinel-format '${value}'. Use one of: ${SENTINEL_FORMATS.join(", ")}.`);
  }
  return format;
}

export function createSentinel(metadata, options = {}) {
  const payload = { version: 1, ...metadata };
  if (normalizeSentinelFormat(options.format) === "comment") {
    return `<!-- ${SENTINEL_PREFIX}${JSON.stringify(payload)} -->`;
  }

  // Key order matches the order blocks/sentinel/block.php registers the attributes in, because
  // the editor serializes in registration order. Emitting them in any other order means the
  // first save of a synced Page rewrites the delimiter for no reason.
  return `<!-- wp:${SENTINEL_BLOCK} ${serializeBlockAttributes({ sentinel: payload, lock: SENTINEL_LOCK })} /-->`;
}

export function prependSentinel(content, metadata, options = {}) {
  return `${createSentinel(metadata, options)}\n${content || ""}`;
}

export function readSentinel(content) {
  const text = String(content || "");
  return readBlockSentinel(text) ?? readCommentSentinel(text);
}

// Which spelling a live Page carries, so a run can tell an already-migrated Page from one
// still holding the pre-block comment. Null when the Page is not managed at all.
export function sentinelFormat(content) {
  const text = String(content || "");
  if (readBlockSentinel(text)) {
    return "block";
  }
  return readCommentSentinel(text) ? "comment" : null;
}

export function stripSentinel(content) {
  return String(content || "")
    .replace(BLOCK_PATTERN, "")
    .replace(COMMENT_PATTERN, "")
    .trim();
}

function readBlockSentinel(text) {
  const match = text.match(BLOCK_PATTERN);
  if (!match || !match[1]) {
    return null;
  }

  return validSentinel(parseJson(match[1])?.sentinel);
}

function readCommentSentinel(text) {
  const match = text.match(COMMENT_PATTERN);
  return match ? validSentinel(parseJson(match[1])) : null;
}

function validSentinel(parsed) {
  return parsed && parsed.version === 1 ? parsed : null;
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// Mirrors serializeAttributes() in @wordpress/blocks. The escapes matter twice over: they keep
// a payload containing `--` from closing the HTML comment early, and they make what this Action
// writes byte-identical to what the block editor writes back when someone saves the Page, so a
// save does not show up as a spurious change on the next run.
function serializeBlockAttributes(attributes) {
  return JSON.stringify(attributes)
    .replace(/--/g, "\\u002d\\u002d")
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\\"/g, "\\u0022");
}
