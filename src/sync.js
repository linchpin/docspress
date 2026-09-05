import { readSentinel } from "./sentinel.js";

export async function syncPages(options) {
  const {
    desiredPages,
    client,
    existingPages: suppliedExistingPages,
    dryRun = false,
    deleteMode = "trash",
    rootSlug = "docs",
    versionsRegistry = null,
    versionTaxonomy = "docspress_versions",
    clientTaxonomy = "docs_client",
    githubRepository = "",
    githubRef = "main",
    githubServerUrl = "https://github.com",
    allowDeletions = true,
    skipUpdateKeys = new Set(),
    logger = console
  } = options;

  const existingPages = suppliedExistingPages || await client.listPages();
  const indexed = indexExistingPages(existingPages);
  const desiredKeys = new Set(desiredPages.map((page) => page.key));
  const result = createResult(dryRun);
  const idByKey = new Map();
  const matchedExistingIds = new Set();
  const versionState = versionsRegistry
    ? await reconcileVersionState({
      client,
      versionsRegistry,
      versionTaxonomy,
      rootSlug,
      dryRun,
      result,
      logger
    })
    : null;
  const clientTermIds = await resolveClientTermIds({
    client,
    clientTaxonomy,
    desiredPages,
    dryRun
  });
  let syntheticId = -1;

  for (const [key, page] of indexed.managedByKey.entries()) {
    idByKey.set(key, page.id);
  }

  for (const desired of desiredPages) {
    const existingAtPath = indexed.byPath.get(desired.key);
    let managed = indexed.managedByKey.get(desired.key);
    if (!managed) {
      managed = (desired.legacyKeys || [])
        .map((key) => indexed.managedByKey.get(key))
        .find((candidate) => candidate && !matchedExistingIds.has(candidate.id));
    }

    if (desired.parentKey && !idByKey.has(desired.parentKey)) {
      addConflict(result, desired.key, `Parent page is unavailable: ${desired.parentKey}`, desired);
      continue;
    }

    if (existingAtPath && !managed) {
      addConflict(result, desired.key, "An unmanaged WordPress page already uses this path.", desired);
      continue;
    }

    const parentId = desired.parentKey ? idByKey.get(desired.parentKey) : 0;
    const payload = pagePayload(desired, parentId, managed, {
      versionTaxonomy,
      versionTermId: desired.docsVersion?.id
        ? versionState?.termIds.get(desired.docsVersion.id)
        : null,
      clientTaxonomy,
      clientTermIds,
      githubRepository,
      githubRef,
      githubServerUrl
    });

    if (managed) {
      matchedExistingIds.add(managed.id);
      if (skipUpdateKeys.has(desired.key)) {
        result.unchanged += 1;
        result.operations.push({
          action: "unchanged",
          key: desired.key,
          id: managed.id,
          reason: "WordPress-only edit is awaiting its pull request.",
          ...pageOperationContext(desired)
        });
        continue;
      }
      if (
        managed.sentinel?.hash === desired.hash
        && managed.parent === parentId
        && managedMetadataMatches(desired, managed, {
          versionTaxonomy,
          versionTermId: desired.docsVersion?.id
            ? versionState?.termIds.get(desired.docsVersion.id)
            : null,
          clientTaxonomy,
          clientTermIds,
          githubRepository,
          githubRef,
          githubServerUrl
        })
      ) {
        result.unchanged += 1;
        result.operations.push({ action: "unchanged", key: desired.key, id: managed.id, ...pageOperationContext(desired) });
        continue;
      }

      result.updated += 1;
      result.operations.push({ action: "update", key: desired.key, id: managed.id, ...pageOperationContext(desired) });
      logger.info?.(`${dryRun ? "Would update" : "Updating"} ${desired.key}`);
      if (!dryRun) {
        const updated = await client.updatePage(managed.id, payload);
        idByKey.set(desired.key, updated.id);
      } else {
        idByKey.set(desired.key, managed.id);
      }
      continue;
    }

    result.created += 1;
    result.operations.push({ action: "create", key: desired.key, ...pageOperationContext(desired) });
    logger.info?.(`${dryRun ? "Would create" : "Creating"} ${desired.key}`);
    if (!dryRun) {
      const created = await client.createPage(payload);
      idByKey.set(desired.key, created.id);
    } else {
      idByKey.set(desired.key, syntheticId);
      syntheticId -= 1;
    }
  }

  const deletions = allowDeletions ? Array.from(indexed.managedByKey.values())
    .filter((page) => (
      isUnderRoot(page.sentinel?.key, rootSlug)
      && !desiredKeys.has(page.sentinel.key)
      && !matchedExistingIds.has(page.id)
    ))
    .sort((a, b) => b.path.split("/").length - a.path.split("/").length) : [];

  for (const page of deletions) {
    result.deleted += 1;
    result.operations.push({
      action: "delete",
      key: page.sentinel.key,
      id: page.id,
      version: page.sentinel?.docsVersion || page.meta?._docspress_version_id || "",
      sourcePath: page.sentinel?.source || page.meta?._docspress_source_path || ""
    });
    logger.info?.(`${dryRun ? "Would delete" : "Deleting"} ${page.sentinel.key}`);
    if (!dryRun) {
      await client.deletePage(page.id, { force: deleteMode === "force" });
    }
  }

  return result;
}

function pagePayload(page, parentId, managed, options = {}) {
  const payload = {
    title: page.title,
    content: page.content,
    slug: page.slug,
    status: page.status,
    parent: parentId || 0
  };

  if (Object.hasOwn(page, "sidebarPosition")) {
    payload.menu_order = page.sidebarPosition;
  } else if (Object.hasOwn(managed?.sentinel || {}, "sidebarPosition")) {
    payload.menu_order = 0;
  }

  const meta = githubSourceMeta(page, options, managed);
  if (page.docsVersion?.id) {
    payload[options.versionTaxonomy] = options.versionTermId ? [options.versionTermId] : [];
    Object.assign(meta, {
      _docspress_version_id: page.docsVersion.id,
      _docspress_logical_route: page.logicalRoute || "",
      _docspress_page_identity: page.stableIdentity,
      _docspress_source_type: page.sourceType,
      _docspress_source_path: page.sourcePath,
      _docspress_docs_root: page.key.split("/")[0],
      _docspress_version_container: false
    });
  } else if (page.versionContainer) {
    meta._docspress_version_container = true;
  } else if (managed?.meta?._docspress_version_id) {
    payload[options.versionTaxonomy] = [];
    Object.assign(meta, {
      _docspress_version_id: "",
      _docspress_logical_route: "",
      _docspress_page_identity: "",
      _docspress_source_type: "",
      _docspress_source_path: page.sourcePath || "",
      _docspress_docs_root: page.key.split("/")[0],
      _docspress_version_container: false
    });
  }
  Object.assign(meta, accessPageMeta(page, managed));

  if (page.accessManagedBy && options.clientTaxonomy) {
    payload[options.clientTaxonomy] = page.access === "client"
      ? clientTermIdsFor(page, options)
      : [];
  }

  if (Object.keys(meta).length > 0) {
    payload.meta = meta;
  }

  const sidebarMeta = sidebarPageMeta(page, managed);
  if (sidebarMeta) {
    payload.meta = {
      ...(payload.meta || {}),
      ...sidebarMeta
    };
  }

  return payload;
}

function managedMetadataMatches(desired, managed, options = {}) {
  const desiredSentinel = readSentinel(desired.content) || {};
  const desiredHasPosition = Object.hasOwn(desired, "sidebarPosition");
  const managedHasPosition = Object.hasOwn(managed.sentinel || {}, "sidebarPosition");
  const desiredHasCollapsed = Object.hasOwn(desired, "sidebarCollapsed");
  const managedHasCollapsed = Object.hasOwn(managed.sentinel || {}, "sidebarCollapsed");
  const desiredHasSourceContent = Object.hasOwn(desiredSentinel, "sourceContentBase64");
  const managedHasSourceContent = Object.hasOwn(managed.sentinel || {}, "sourceContentBase64");
  const positionMatches = desiredHasPosition
    ? managedHasPosition
      && managed.sentinel.sidebarPosition === desired.sidebarPosition
      && managed.menuOrder === desired.sidebarPosition
    : !managedHasPosition;
  const collapsedMatches = desiredHasCollapsed
    ? managedHasCollapsed && managed.sentinel.sidebarCollapsed === desired.sidebarCollapsed
    : !managedHasCollapsed;
  const sourceContentMatches = desiredHasSourceContent
    ? managedHasSourceContent && managed.sentinel.sourceContentBase64 === desiredSentinel.sourceContentBase64
    : !managedHasSourceContent;
  const desiredHasSidebar = Boolean(desired.sidebarId);
  const managedHasSidebar = Boolean(
    managed.sentinel?.sidebarId
      || managed.sentinel?.sidebarRoot
      || managed.meta?._docspress_sidebar_id
      || normalizeBooleanMeta(managed.meta?._docspress_sidebar_root)
  );
  const sidebarMatches = desiredHasSidebar
    ? managed.sentinel?.sidebarId === desired.sidebarId
      && normalizeBooleanMeta(managed.sentinel?.sidebarRoot) === Boolean(desired.sidebarRoot)
      && String(managed.meta?._docspress_sidebar_id || "") === desired.sidebarId
      && normalizeBooleanMeta(managed.meta?._docspress_sidebar_root) === Boolean(desired.sidebarRoot)
    : !managedHasSidebar;

  const desiredVersion = desired.docsVersion?.id || "";
  const versionMatches = String(managed.meta?._docspress_version_id || "") === desiredVersion;
  const logicalRouteMatches = String(managed.meta?._docspress_logical_route || "") === String(desired.logicalRoute || "");
  const identityMatches = String(managed.meta?._docspress_page_identity || "") === String(desired.stableIdentity || "");
  const sourceTypeMatches = String(managed.meta?._docspress_source_type || "") === String(desired.sourceType || "");
  const sourcePathMatches = !desiredVersion
    || String(managed.meta?._docspress_source_path || "") === String(desired.sourcePath || "");
  const githubMeta = githubSourceMeta(desired, options, managed);
  const githubMetaVisible = Object.keys(githubMeta).every((key) => Object.hasOwn(managed.meta || {}, key));
  const githubMatches = !(desiredVersion || githubMetaVisible) || Object.entries(githubMeta).every(
    ([key, value]) => String(managed.meta?.[key] || "") === String(value)
  );
  const taxonomyMatches = !desiredVersion
    ? (managed.terms?.[options.versionTaxonomy] || []).length === 0
    : termsMatch(managed.terms?.[options.versionTaxonomy], options.versionTermId ? [options.versionTermId] : []);
  const containerMatches = normalizeBooleanMeta(managed.meta?._docspress_version_container) === Boolean(desired.versionContainer);
  const accessMatches = accessMetadataMatches(desired, managed, options);

  return positionMatches
    && collapsedMatches
    && sourceContentMatches
    && sidebarMatches
    && versionMatches
    && logicalRouteMatches
    && identityMatches
    && sourceTypeMatches
    && sourcePathMatches
    && githubMatches
    && containerMatches
    && taxonomyMatches
    && accessMatches;
}

/**
 * Whether stored access state still matches what the repository declares.
 *
 * Without this, an edit in the WordPress panel would never be detected as
 * drift and a repository-managed tier would quietly go stale.
 */
function accessMetadataMatches(desired, managed, options = {}) {
  const desiredManagedBy = desired.accessManagedBy || "";
  const storedManagedBy = String(managed.meta?._docs_access_managed || "");

  if (!desiredManagedBy) {
    // The panel owns this page; only the marker must be clear.
    return storedManagedBy === "";
  }

  if (storedManagedBy !== desiredManagedBy) {
    return false;
  }

  if (String(managed.meta?._docs_access || "") !== String(desired.access || "")) {
    return false;
  }

  if (!options.clientTaxonomy) {
    return true;
  }

  const expected = desired.access === "client" ? clientTermIdsFor(desired, options) : [];

  return termsMatch(managed.terms?.[options.clientTaxonomy], expected);
}

/**
 * Access meta written for a page.
 *
 * When the repository stops managing access, only the "managed by" marker is
 * cleared. The last tier is deliberately left in place so control hands back to
 * the editor panel without a restricted page silently reverting to public.
 */
function accessPageMeta(page, managed) {
  if (page.accessManagedBy) {
    return {
      _docs_access: page.access || "",
      _docs_access_managed: page.accessManagedBy
    };
  }

  if (managed?.meta?._docs_access_managed) {
    return { _docs_access_managed: "" };
  }

  return {};
}

function clientTermIdsFor(page, options) {
  const ids = (page.clientSlugs || [])
    .map((slug) => options.clientTermIds?.get(slug))
    .filter((id) => Number.isFinite(id));

  return Array.from(new Set(ids));
}

/**
 * Map every client slug the run needs to an existing term ID.
 *
 * Terms are never created here. A client term is an access-control principal
 * with users attached to it; conjuring one from a typo in a workflow input
 * would publish documentation scoped to a client nobody belongs to.
 */
async function resolveClientTermIds({ client, clientTaxonomy, desiredPages, dryRun }) {
  const wanted = new Set();

  for (const page of desiredPages) {
    if (page.accessManagedBy && page.access === "client") {
      for (const slug of page.clientSlugs || []) {
        wanted.add(slug);
      }
    }
  }

  const termIds = new Map();

  if (wanted.size === 0) {
    return termIds;
  }

  let terms;
  try {
    terms = await client.listTerms(clientTaxonomy);
  } catch (error) {
    throw new Error(`Client-scoped documentation requires an active plugin exposing the ${clientTaxonomy} taxonomy through REST. ${error.message}`);
  }

  const bySlug = new Map(terms.map((term) => [term.slug, term.id]));
  const missing = [];
  let syntheticTermId = -1;

  for (const slug of wanted) {
    if (bySlug.has(slug)) {
      termIds.set(slug, bySlug.get(slug));
    } else if (dryRun) {
      termIds.set(slug, syntheticTermId--);
    } else {
      missing.push(slug);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Unknown documentation client(s): ${missing.join(", ")}. Create the ${clientTaxonomy} term in WordPress before syncing client-scoped docs.`);
  }

  return termIds;
}

function sidebarPageMeta(page, managed) {
  if (page.sidebarId) {
    return {
      _docspress_sidebar_id: page.sidebarId,
      _docspress_sidebar_root: Boolean(page.sidebarRoot)
    };
  }

  if (
    managed?.sentinel?.sidebarId
      || managed?.sentinel?.sidebarRoot
      || managed?.meta?._docspress_sidebar_id
      || normalizeBooleanMeta(managed?.meta?._docspress_sidebar_root)
  ) {
    return {
      _docspress_sidebar_id: "",
      _docspress_sidebar_root: false
    };
  }

  return null;
}

function githubSourceMeta(page, options = {}, managed = null) {
  const sourcePath = page?.sourcePath || "";
  const path = sourcePath.includes(":") ? "" : sourcePath;
  const meta = {};
  if (path || managed?.meta?._docspress_github_path) {
    meta._docspress_github_path = path;
  }

  // Without a known repository, leave the one already recorded on the page alone
  // instead of clearing the source links the theme builds from it.
  if (!options.githubRepository) {
    return meta;
  }
  return {
    ...meta,
    _docspress_github_repository: options.githubRepository,
    _docspress_github_ref: options.githubRef || "main",
    _docspress_github_server_url: options.githubServerUrl || "https://github.com"
  };
}

function createResult(dryRun) {
  return {
    dryRun,
    created: 0,
    updated: 0,
    deleted: 0,
    unchanged: 0,
    conflicts: 0,
    conflictDetails: [],
    operations: [],
    versionOperations: [],
    effectiveLatest: ""
  };
}

function addConflict(result, key, reason, page = {}) {
  const context = pageOperationContext(page);
  result.conflicts += 1;
  result.conflictDetails.push({ key, reason, ...context });
  result.operations.push({ action: "conflict", key, reason, ...context });
}

function pageOperationContext(page) {
  return {
    version: page.docsVersion?.id || "",
    sourcePath: page.sourcePath || "",
    logicalRoute: page.logicalRoute || ""
  };
}

async function reconcileVersionState({
  client,
  versionsRegistry,
  versionTaxonomy,
  rootSlug,
  dryRun,
  result,
  logger
}) {
  let existingTerms;
  let settings;
  try {
    [existingTerms, settings] = await Promise.all([
      client.listTerms(versionTaxonomy),
      client.getSettings()
    ]);
  } catch (error) {
    throw new Error(`DocsPress versioning requires an active DocsPress Blocks plugin exposing ${versionTaxonomy} and version settings through REST. ${error.message}`);
  }

  if (!Object.hasOwn(settings, "docspress_repository_latest_version")
    || !Object.hasOwn(settings, "docspress_version_override")
    || !Object.hasOwn(settings, "docspress_docs_root_slug")) {
    throw new Error("DocsPress Blocks is active but its version settings are not exposed through the WordPress REST settings endpoint.");
  }

  const configuredIds = new Set(versionsRegistry.versions.map(({ id }) => id));
  const override = configuredIds.has(String(settings.docspress_version_override || ""))
    ? String(settings.docspress_version_override)
    : "";
  const effectiveLatest = override || versionsRegistry.latest;
  const existingBySlug = new Map(existingTerms.map((term) => [term.slug, term]));
  const termIds = new Map();
  let syntheticTermId = -1;

  for (const version of versionsRegistry.versions) {
    const expectedMeta = {
      docspress_version_order: version.order,
      docspress_version_active: true,
      docspress_version_repository_latest: version.id === versionsRegistry.latest,
      docspress_version_effective_latest: version.id === effectiveLatest
    };
    const existing = existingBySlug.get(version.id);
    const needsUpdate = !existing
      || existing.name !== version.label
      || !versionMetaMatches(existing.meta, expectedMeta);

    if (needsUpdate) {
      result.versionOperations.push({
        action: existing ? "update-term" : "create-term",
        version: version.id
      });
      logger.info?.(`${dryRun ? "Would synchronize" : "Synchronizing"} documentation version ${version.id}`);
    }

    if (dryRun) {
      termIds.set(version.id, existing?.id || syntheticTermId--);
    } else if (!existing) {
      const created = await client.createTerm(versionTaxonomy, {
        name: version.label,
        slug: version.id,
        meta: expectedMeta
      });
      termIds.set(version.id, created.id);
    } else if (needsUpdate) {
      const updated = await client.updateTerm(versionTaxonomy, existing.id, {
        name: version.label,
        meta: expectedMeta
      });
      termIds.set(version.id, updated.id);
    } else {
      termIds.set(version.id, existing.id);
    }
  }

  for (const term of existingTerms) {
    if (configuredIds.has(term.slug) || !term.meta?.docspress_version_active) {
      continue;
    }
    result.versionOperations.push({ action: "deactivate-term", version: term.slug });
    if (!dryRun) {
      await client.updateTerm(versionTaxonomy, term.id, {
        meta: {
          ...term.meta,
          docspress_version_active: false,
          docspress_version_repository_latest: false,
          docspress_version_effective_latest: false
        }
      });
    }
  }

  const settingPayload = {
    docspress_repository_latest_version: versionsRegistry.latest,
    docspress_docs_root_slug: rootSlug
  };
  if (
    settings.docspress_repository_latest_version !== versionsRegistry.latest
    || settings.docspress_docs_root_slug !== rootSlug
  ) {
    result.versionOperations.push({ action: "update-settings", latest: versionsRegistry.latest, rootSlug });
    if (!dryRun) {
      await client.updateSettings(settingPayload);
    }
  }

  result.effectiveLatest = effectiveLatest;
  return { termIds, effectiveLatest };
}

function versionMetaMatches(actual, expected) {
  return Object.entries(expected).every(([key, value]) => {
    if (typeof value === "boolean") {
      return normalizeBooleanMeta(actual?.[key]) === value;
    }
    return Number(actual?.[key]) === Number(value);
  });
}

function termsMatch(actual, expected) {
  const left = (actual || []).map(Number).sort((a, b) => a - b);
  const right = (expected || []).map(Number).sort((a, b) => a - b);
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function normalizeBooleanMeta(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function isUnderRoot(key, rootSlug) {
  return key === rootSlug || key?.startsWith(`${rootSlug}/`);
}

export function indexExistingPages(pages) {
  const byId = new Map();
  const byPath = new Map();
  const managedByKey = new Map();

  for (const page of pages) {
    byId.set(page.id, {
      ...page,
      sentinel: readSentinel(page.content)
    });
  }

  for (const page of byId.values()) {
    page.path = pathForPage(page, byId);
    byPath.set(page.path, page);

    if (page.sentinel?.key) {
      managedByKey.set(page.sentinel.key, page);
    }
  }

  return {
    byId,
    byPath,
    managedByKey
  };
}

function pathForPage(page, byId, seen = new Set()) {
  if (!page.parent || seen.has(page.id) || !byId.has(page.parent)) {
    return page.slug;
  }

  seen.add(page.id);
  const parent = byId.get(page.parent);
  return `${pathForPage(parent, byId, seen)}/${page.slug}`;
}
