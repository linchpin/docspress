import * as core from "@actions/core";
import { syncBidirectional } from "./bidirectional.js";
import { collectDesiredPages, normalizeAccessTier, normalizeClientSlugs } from "./docs.js";
import { isManagedPullRequestMerge } from "./github-event.js";
import { githubContext, GitHubPullRequestClient } from "./github.js";
import { syncPages } from "./sync.js";
import { normalizeBoolean } from "./utils.js";
import { WordPressClient } from "./wordpress.js";
import { readVersionsRegistry } from "./versions.js";

async function main() {
  const mode = normalizeMode(core.getInput("mode") || "publish");
  const config = {
    mode,
    baseUrl: core.getInput("wordpress-url") || "https://public-api.wordpress.com",
    site: core.getInput("wordpress-site", { required: true }),
    token: core.getInput("wordpress-access-token", { required: true }),
    docsDir: core.getInput("docs-dir") || "docs",
    manifestFile: core.getInput("manifest-file") || "",
    sidebarsFile: core.getInput("sidebars-file") || "",
    redirectsFile: core.getInput("redirects-file") || "",
    versionsFile: core.getInput("versions-file") || "",
    rootSlug: core.getInput("root-slug") || "docs",
    rootTitle: core.getInput("root-title") || "Docs",
    createH1: normalizeBoolean(core.getInput("create-h1") || "false"),
    rewriteLinks: normalizeBoolean(core.getInput("rewrite-links") || "true"),
    editLink: normalizeBoolean(core.getInput("edit-link") || "false"),
    editLinkText: core.getInput("edit-link-text") || "Edit this page on GitHub",
    githubRepository: core.getInput("github-repository") || process.env.GITHUB_REPOSITORY || "",
    githubRef: core.getInput("github-ref") || process.env.GITHUB_REF_NAME || "main",
    githubServerUrl: core.getInput("github-server-url") || process.env.GITHUB_SERVER_URL || "https://github.com",
    githubToken: core.getInput("github-token"),
    pullRequestBase: core.getInput("pull-request-base") || "",
    pullRequestBranch: core.getInput("pull-request-branch") || "docspress/wordpress-sync",
    pullRequestTitle: core.getInput("pull-request-title"),
    status: core.getInput("status") || "publish",
    access: normalizeAccessTier(core.getInput("access") || "", "access input"),
    clientSlugs: normalizeClientSlugs(core.getInput("client") || "", "client input"),
    deleteMode: core.getInput("delete-mode") || "trash",
    dryRun: normalizeBoolean(core.getInput("dry-run") || "false")
  };

  if (isManagedPullRequestMerge({
    eventName: githubContext.eventName,
    commitMessage: githubContext.payload.head_commit?.message,
    repository: process.env.GITHUB_REPOSITORY || "",
    branch: config.pullRequestBranch
  })) {
    core.notice(`Skipping the merge from the action-owned ${config.pullRequestBranch} branch.`);
    const result = emptyResult(config.dryRun, true);
    setOutputs(result);
    await writeSummary(result);
    return;
  }

  // Reverse sync turns WordPress edits into a pull request against the source
  // repository. For a repository whose docs are not public that would publish
  // restricted content into git, so refuse the combination outright rather than
  // relying on per-page markers that inherited tiers do not carry.
  if (config.mode !== "publish" && config.access && config.access !== "public") {
    throw new Error(`mode: ${config.mode} cannot be combined with "access: ${config.access}". Reverse sync would copy restricted documentation into this repository. Use mode: publish for non-public docs.`);
  }

  if (config.access === "client" && config.clientSlugs.length === 0) {
    throw new Error('The "access: client" input requires a "client" input naming at least one docs_client term slug.');
  }

  if (config.access && config.access !== "client" && config.clientSlugs.length > 0) {
    throw new Error(`The "client" input only applies to "access: client"; this run sets access: ${config.access}.`);
  }

  const versionsRegistry = config.versionsFile
    ? await readVersionsRegistry({ cwd: process.cwd(), versionsFile: config.versionsFile })
    : null;
  const desiredPages = await collectDesiredPages({
    cwd: process.cwd(),
    docsDir: config.docsDir,
    manifestFile: config.manifestFile,
    sidebarsFile: config.sidebarsFile,
    redirectsFile: config.redirectsFile,
    versionsFile: config.versionsFile,
    versionsRegistry,
    rootSlug: config.rootSlug,
    rootTitle: config.rootTitle,
    createH1: config.createH1,
    rewriteLinks: config.rewriteLinks,
    editLink: config.editLink,
    editLinkText: config.editLinkText,
    githubRepository: config.githubRepository,
    githubRef: config.githubRef,
    githubServerUrl: config.githubServerUrl,
    status: config.status,
    access: config.access,
    clientSlugs: config.clientSlugs
  });

  core.info(`Docspress found ${desiredPages.length} desired page(s) in ${config.docsDir}.`);

  const clientTaxonomy = "docs_client";
  const managesAccess = desiredPages.some((page) => Boolean(page.accessManagedBy));
  const taxonomies = [];

  if (versionsRegistry) {
    taxonomies.push("docspress_versions");
  }

  // Only read the client taxonomy back when this run manages access, so a
  // public docs repository never touches it.
  if (managesAccess) {
    taxonomies.push(clientTaxonomy);
  }

  const client = new WordPressClient({
    baseUrl: config.baseUrl,
    site: config.site,
    token: config.token,
    taxonomies
  });

  const result = config.mode === "publish"
    ? await syncPages({
      desiredPages,
      client,
      dryRun: config.dryRun,
      deleteMode: config.deleteMode,
      rootSlug: config.rootSlug,
      versionsRegistry,
      clientTaxonomy: managesAccess ? clientTaxonomy : "",
      githubRepository: config.githubRepository,
      githubRef: config.githubRef,
      githubServerUrl: config.githubServerUrl,
      logger: core
    })
    : await syncBidirectional({
      mode: config.mode,
      desiredPages,
      client,
      githubClient: config.dryRun ? null : new GitHubPullRequestClient({
        token: config.githubToken,
        repository: process.env.GITHUB_REPOSITORY,
        base: config.pullRequestBase,
        branch: config.pullRequestBranch,
        title: config.pullRequestTitle
      }),
      dryRun: config.dryRun,
      deleteMode: config.deleteMode,
      rootSlug: config.rootSlug,
      versionsRegistry,
      cwd: process.cwd(),
      manifestFile: config.manifestFile,
      createH1: config.createH1,
      githubRepository: config.githubRepository,
      githubRef: config.githubRef,
      githubServerUrl: config.githubServerUrl,
      logger: core
    });

  setOutputs(result);
  await writeSummary(result);

  if (result.conflicts > 0) {
    for (const conflict of result.conflictDetails) {
      core.error(`Conflict ${conflict.key}: ${conflict.reason}`);
    }
    core.setFailed(`Docspress found ${result.conflicts} synchronization conflict(s).`);
  }
}

function setOutputs(result) {
  core.setOutput("created", String(result.created));
  core.setOutput("updated", String(result.updated));
  core.setOutput("deleted", String(result.deleted));
  core.setOutput("unchanged", String(result.unchanged));
  core.setOutput("conflicts", String(result.conflicts));
  core.setOutput("proposed", String(result.proposed || 0));
  core.setOutput("skipped", String(Boolean(result.skipped)));
  core.setOutput("pull-request-number", result.pullRequest?.number ? String(result.pullRequest.number) : "");
  core.setOutput("pull-request-url", result.pullRequest?.url || "");
  core.setOutput("summary-json", JSON.stringify(result));
}

async function writeSummary(result) {
  if (!core.summary) {
    return;
  }

  core.summary
    .addHeading(`Docspress ${result.dryRun ? "Dry Run" : "Sync"} Summary`)
    .addTable([
      [{ data: "Created", header: true }, String(result.created)],
      [{ data: "Updated", header: true }, String(result.updated)],
      [{ data: "Deleted", header: true }, String(result.deleted)],
      [{ data: "Unchanged", header: true }, String(result.unchanged)],
      [{ data: "Proposed files", header: true }, String(result.proposed || 0)],
      [{ data: "Conflicts", header: true }, String(result.conflicts)],
      [{ data: "Skipped managed merge", header: true }, String(Boolean(result.skipped))]
    ]);

  if (result.pullRequest?.url) {
    core.summary.addLink(`Pull request #${result.pullRequest.number}`, result.pullRequest.url);
  }

  if (result.effectiveLatest) {
    core.summary.addRaw(`\nEffective latest version: \`${result.effectiveLatest}\`\n`);
  }

  if (result.proposedFileDetails?.length > 0) {
    core.summary.addHeading("Proposed files", 2);
    for (const file of result.proposedFileDetails) {
      const version = file.version ? ` (${file.version})` : "";
      core.summary.addRaw(`- \`${file.path}\`${version}\n`);
    }
  }

  if (result.conflictDetails.length > 0) {
    core.summary.addHeading("Conflicts", 2);
    for (const conflict of result.conflictDetails) {
      const version = conflict.version ? ` (${conflict.version})` : "";
      const source = conflict.sourcePath ? ` → \`${conflict.sourcePath}\`` : "";
      core.summary.addRaw(`- \`${conflict.key}\`${version}${source}: ${conflict.reason}\n`);
    }
  }

  await core.summary.write();
}

function emptyResult(dryRun, skipped = false) {
  return {
    dryRun,
    created: 0,
    updated: 0,
    deleted: 0,
    unchanged: 0,
    conflicts: 0,
    proposed: 0,
    skipped,
    conflictDetails: [],
    operations: [],
    pullRequest: null
  };
}

function normalizeMode(value) {
  const mode = String(value || "").trim().toLowerCase();
  if (!["publish", "propose", "reconcile"].includes(mode)) {
    throw new Error(`Invalid mode '${value}'. Use publish, propose, or reconcile.`);
  }
  return mode;
}

main().catch((error) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
