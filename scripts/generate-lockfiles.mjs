import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectDirectory = fileURLToPath(new URL("../", import.meta.url));

function run(manager, args, capture = false) {
  const result = spawnSync(manager, args, {
    cwd: projectDirectory,
    shell: process.platform === "win32",
    stdio: capture ? "pipe" : "inherit",
    encoding: "utf8",
  });

  if (result.error || result.status !== 0) {
    throw new Error(
      result.error?.message ??
        `${manager} ${args.join(" ")} failed: ${result.stderr ?? ""}`,
    );
  }

  return result.stdout?.trim() ?? "";
}

try {
  run("npm", ["--version"], true);
  const yarnVersion = run("yarn", ["--version"], true);
  run("pnpm", ["--version"], true);

  if (!yarnVersion.startsWith("1.")) {
    throw new Error("This script requires Yarn Classic 1.x for yarn import.");
  }

  if (existsSync(new URL("../yarn.lock", import.meta.url))) {
    throw new Error(
      "yarn.lock already exists. Back it up and remove it before regenerating all lockfiles.",
    );
  }

  run("npm", [
    "install",
    "--package-lock-only",
    "--lockfile-version=1",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
  ]);
  run("yarn", ["import"]);
  run("pnpm", ["import"]);

  console.log("Created package-lock.json, yarn.lock, and pnpm-lock.yaml.");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
