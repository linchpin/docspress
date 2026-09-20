import { describe, expect, it } from "vitest";
import {
  isVisible,
  toggleExpanded,
  visiblePages
} from "../plugins/docspress-blocks/src/modules/pages-list/hierarchy.js";

const tree = [
  { id: 1, parent: 0, level: 0, hasChildren: true },
  { id: 2, parent: 1, level: 1, hasChildren: true },
  { id: 3, parent: 2, level: 2, hasChildren: false },
  { id: 4, parent: 0, level: 0, hasChildren: false }
];

describe("pages-list hierarchy", () => {
  it("shows only roots when nothing is expanded", () => {
    const visible = visiblePages(tree, new Set());
    expect(visible.map((page) => page.id)).toEqual([1, 4]);
  });

  it("reveals children when ancestors are expanded", () => {
    const visible = visiblePages(tree, new Set([1, 2]));
    expect(visible.map((page) => page.id)).toEqual([1, 2, 3, 4]);
  });

  it("hides grandchildren when only the root is expanded", () => {
    expect(isVisible(tree[2], tree, new Set([1]))).toBe(false);
    expect(isVisible(tree[1], tree, new Set([1]))).toBe(true);
  });

  it("toggles expansion membership", () => {
    const once = toggleExpanded(new Set(), 1);
    expect(once.has(1)).toBe(true);
    const twice = toggleExpanded(once, 1);
    expect(twice.has(1)).toBe(false);
  });
});
