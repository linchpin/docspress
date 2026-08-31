#!/usr/bin/env node
/**
 * Package the theme and plugin exactly as the published release assets are built:
 * a copy of the directory renamed to its WordPress install folder, zipped.
 *
 * Usage:
 *   node scripts/build-release-zips.mjs                 # both packages
 *   node scripts/build-release-zips.mjs --only theme    # theme only
 *   node scripts/build-release-zips.mjs --version 0.10.7.1
 *
 * Writes release/<name>.zip and release/<name>-<version>.zip, matching the asset
 * pair on each GitHub release. Nothing here compiles: the theme and plugin are
 * plain PHP, CSS, and hand-authored JavaScript.
 */
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(rootDir, "release");
const workDir = path.join(outDir, ".stage");

const PACKAGES = {
  theme: {
    source: "theme",
    installFolder: "docspress",
    asset: "docspress-theme",
    versionFile: path.join("theme", "style.css"),
    versionPattern: /^Version:\s*(.+)$/m
  },
  blocks: {
    source: path.join("plugins", "docspress-blocks"),
    installFolder: "docspress-blocks",
    asset: "docspress-blocks",
    versionFile: path.join("plugins", "docspress-blocks", "docspress-blocks.php"),
    versionPattern: /^\s*\*\s*Version:\s*(.+)$/m
  }
};

// Never ship developer noise, even though these are not present today.
const EXCLUDE = ["node_modules", ".git", ".DS_Store", "*.map"];

function parseArgs(argv) {
  const args = { only: null, version: null };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--only") {
      args.only = argv[index += 1];
    } else if (argv[index] === "--version") {
      args.version = argv[index += 1];
    } else {
      throw new Error(`Unknown argument: ${argv[index]}`);
    }
  }
  if (args.only && !Object.hasOwn(PACKAGES, args.only)) {
    throw new Error(`--only expects one of: ${Object.keys(PACKAGES).join(", ")}`);
  }
  return args;
}

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "ignore", "inherit"] });
    child.on("error", reject);
    child.on("exit", (code) => {
      code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`));
    });
  });
}

async function readVersion(pkg) {
  const contents = await fs.readFile(path.join(rootDir, pkg.versionFile), "utf8");
  const match = contents.match(pkg.versionPattern);
  if (!match) {
    throw new Error(`Could not read a version from ${pkg.versionFile}`);
  }
  return match[1].trim();
}

async function build(pkg, overrideVersion) {
  const version = overrideVersion || await readVersion(pkg);
  const stage = path.join(workDir, pkg.installFolder);
  await fs.rm(stage, { recursive: true, force: true });
  await fs.mkdir(workDir, { recursive: true });
  await fs.cp(path.join(rootDir, pkg.source), stage, { recursive: true });

  for (const pattern of EXCLUDE) {
    if (!pattern.includes("*")) {
      await fs.rm(path.join(stage, pattern), { recursive: true, force: true });
    }
  }

  const zips = [`${pkg.asset}.zip`, `${pkg.asset}-${version}.zip`];
  for (const zip of zips) {
    const target = path.join(outDir, zip);
    await fs.rm(target, { force: true });
    await run("zip", ["-rq", "-X", target, pkg.installFolder, "-x", ...EXCLUDE.map((p) => `*/${p}`)], workDir);
  }
  await fs.rm(stage, { recursive: true, force: true });

  const { size } = await fs.stat(path.join(outDir, zips[0]));
  return { version, zips, size };
}

const args = parseArgs(process.argv.slice(2));
await fs.mkdir(outDir, { recursive: true });

const selected = args.only ? [args.only] : Object.keys(PACKAGES);
for (const name of selected) {
  const { version, zips, size } = await build(PACKAGES[name], args.version);
  const kb = Math.round(size / 1024);
  console.log(`${name}: ${version} → release/${zips.join(", release/")} (${kb}kB)`);
}
await fs.rm(workDir, { recursive: true, force: true });
console.log(`\nInstall folder names match the published assets: ${
  selected.map((name) => `${PACKAGES[name].installFolder}/`).join(", ")
}`);
