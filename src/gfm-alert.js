// GitHub alert syntax (`> [!WARNING]`) mapped onto `docspress/callout`.
//
// The reverse direction already emits this syntax — `renderCallout` turns a callout's tone
// into `[!TIP]`, `[!WARNING]` and so on — but the forward direction did not read it back, so
// a hand-written alert became a plain `core/quote` and a round-tripped one degraded on its
// next sync. These two tables are inverses of each other, which is what makes the pair stable.

// Forward: alert type to callout tone. `IMPORTANT` is deliberately absent — the block's tone
// allow-list is note/tip/warning/danger/success, so nothing maps back to it and converting
// one would silently reappear as `[!NOTE]`. It stays a quote instead.
const TYPE_TO_TONE = {
  NOTE: "note",
  TIP: "tip",
  WARNING: "warning",
  CAUTION: "danger"
};

const ALERT_PATTERN = /^\[!([A-Z]+)\]\s*$/;

// Reads the leading `[!TYPE]` marker off a blockquote's children.
// Returns null when this is an ordinary quote, which is the common case.
export function matchAlert(node) {
  if (node?.type !== "blockquote") {
    return null;
  }

  const children = node.children || [];
  const first = children[0];
  if (first?.type !== "paragraph") {
    return null;
  }

  // remark keeps `[!NOTE]` as a single text node followed by the line break.
  const firstText = first.children?.[0];
  if (firstText?.type !== "text") {
    return null;
  }

  const [markerLine, ...restLines] = String(firstText.value || "").split("\n");
  const match = markerLine.trim().match(ALERT_PATTERN);
  if (!match) {
    return null;
  }

  const tone = TYPE_TO_TONE[match[1]];
  if (!tone) {
    return null;
  }

  // Rebuild the first paragraph without the marker line. When the marker was the whole
  // paragraph the paragraph goes away entirely.
  const remainderText = restLines.join("\n").replace(/^\n+/, "");
  const remainingInline = [
    ...(remainderText ? [{ type: "text", value: remainderText }] : []),
    ...(first.children || []).slice(1)
  ];
  const body = [
    ...(remainingInline.length > 0 ? [{ ...first, children: remainingInline }] : []),
    ...children.slice(1)
  ];

  return { tone, body };
}
