import { hashPageState, livePageState } from "./page-state.js";
import { indexExistingPages, isSharedAncestor, isUnderPath } from "./sync.js";

export function planReconciliation(options) {
  const { desiredPages, existingPages, ownedPath = "" } = options;
  const indexed = indexExistingPages(existingPages);
  const desiredByKey = new Map(desiredPages.map((page) => [page.key, page]));
  const wordpressChanges = [];
  const refreshPages = [];
  const conflicts = [];
  const warnings = [];
  const classifications = [];

  for (const desired of desiredPages) {
    // Every repository below a shared parent generates that parent, so no single Markdown
    // tree can take an edit to it. WordPress owns it; see the matching rule in syncPages.
    if (isSharedAncestor(desired.key, ownedPath)) {
      classifications.push({ key: desired.key, state: "shared", desired });
      continue;
    }

    const managed = indexed.managedByKey.get(desired.key);
    if (!managed) {
      classifications.push({ key: desired.key, state: "github-only", desired });
      continue;
    }

    const live = livePageState(managed, indexed);
    const liveHash = hashPageState(live);
    const baseHash = managed.sentinel?.hash || "";

    if (liveHash === desired.hash) {
      const state = baseHash === desired.hash ? "unchanged" : "converged";
      classifications.push({ key: desired.key, state, desired, page: managed });
      if (state === "converged") {
        refreshPages.push(desired);
      }
      continue;
    }

    if (desired.hash === baseHash) {
      const structuralChanges = changedStructuralFields(desired, live);
      if (structuralChanges.length > 0) {
        conflicts.push({
          key: desired.key,
          reason: `WordPress changed unsupported field(s): ${structuralChanges.join(", ")}.`
        });
        classifications.push({ key: desired.key, state: "conflict", desired, page: managed });
        continue;
      }
      // A generated Page (a section placeholder, a manifest entry without a source, a
      // redirect) has no file to write the edit into. Failing here would stop every other
      // Page's proposal with it, so leave the edit in WordPress and say so.
      if (!desired.sourcePath || desired.sourcePath.includes(":")) {
        warnings.push({
          key: desired.key,
          sourcePath: desired.sourcePath || "",
          reason: "Edited in WordPress, but this Page is generated and has no Markdown file to write the edit to. Add one to keep the edit in the repository; until then it stays in WordPress only."
        });
        classifications.push({ key: desired.key, state: "wordpress-only-unmapped", desired, page: managed });
        continue;
      }
      wordpressChanges.push({ desired, page: managed });
      classifications.push({ key: desired.key, state: "wordpress-only", desired, page: managed });
      continue;
    }

    if (liveHash === baseHash) {
      classifications.push({ key: desired.key, state: "github-only", desired, page: managed });
      continue;
    }

    conflicts.push({
      key: desired.key,
      reason: "The Markdown source and WordPress Page both changed since the last synchronized version."
    });
    classifications.push({ key: desired.key, state: "conflict", desired, page: managed });
  }

  for (const [key, managed] of indexed.managedByKey.entries()) {
    if (desiredByKey.has(key)) {
      continue;
    }
    // Managed pages owned by another repository publishing into the same
    // parent are not this repository's to classify, delete, or conflict over.
    if (ownedPath && !isUnderPath(key, ownedPath)) {
      continue;
    }
    const liveHash = hashPageState(livePageState(managed, indexed));
    if (liveHash !== managed.sentinel?.hash) {
      conflicts.push({
        key,
        reason: "The Markdown source was deleted while the WordPress Page also contains newer changes."
      });
      classifications.push({ key, state: "conflict", page: managed });
    } else {
      classifications.push({ key, state: "github-only-delete", page: managed });
    }
  }

  return {
    indexed,
    wordpressChanges,
    refreshPages,
    conflicts,
    warnings,
    classifications
  };
}

function changedStructuralFields(desired, live) {
  return ["key", "sourcePath", "slug", "parentKey", "status"]
    .filter((field) => desired[field] !== live[field]);
}
