import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_TIMEOUT_MS = 3500;

function safeError(error) {
  return error?.message || String(error || "unknown error");
}

function runCommand(command, args = [], options = {}) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = execFile(command, args, {
      cwd: options.cwd,
      timeout: options.timeoutMs || DEFAULT_TIMEOUT_MS,
      maxBuffer: options.maxBuffer || 1024 * 1024,
      env: process.env
    }, (error, stdout = "", stderr = "") => {
      resolve({
        ok: !error,
        command,
        args,
        cwd: options.cwd || "",
        durationMs: Date.now() - startedAt,
        stdout: String(stdout || "").trim(),
        stderr: String(stderr || "").trim(),
        error: error ? safeError(error) : ""
      });
    });
    child.on("error", (error) => {
      resolve({
        ok: false,
        command,
        args,
        cwd: options.cwd || "",
        durationMs: Date.now() - startedAt,
        stdout: "",
        stderr: "",
        error: safeError(error)
      });
    });
  });
}

async function readJsonFile(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    return { error: safeError(error) };
  }
}

async function readRepoSnapshot(name, repoDir) {
  const [branch, sha, status, lastCommit] = await Promise.all([
    runCommand("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: repoDir }),
    runCommand("git", ["rev-parse", "HEAD"], { cwd: repoDir }),
    runCommand("git", ["status", "--short"], { cwd: repoDir }),
    runCommand("git", ["log", "-1", "--pretty=format:%h%x09%ci%x09%s"], { cwd: repoDir })
  ]);
  const packageJson = await readJsonFile(path.join(repoDir, "package.json"));
  const dirtyFiles = status.ok && status.stdout ? status.stdout.split(/\r?\n/).filter(Boolean) : [];

  return {
    name,
    path: repoDir,
    ok: branch.ok && sha.ok && status.ok,
    branch: branch.stdout || "unknown",
    sha: sha.stdout || "unknown",
    shortSha: sha.stdout ? sha.stdout.slice(0, 7) : "unknown",
    dirty: dirtyFiles.length > 0,
    dirtyFiles,
    lastCommit: lastCommit.stdout || "unknown",
    package: {
      name: packageJson.name || "unknown",
      version: packageJson.version || "unknown",
      hasVerify: Boolean(packageJson.scripts?.verify),
      hasDeploySafe: Boolean(packageJson.scripts?.["verify:deploy-safe"]),
      hasPublicVerify: Boolean(packageJson.scripts?.["verify:public"])
    },
    errors: [branch, sha, status, lastCommit]
      .filter((item) => !item.ok)
      .map((item) => `${item.command} ${item.args.join(" ")}: ${item.error || item.stderr}`)
  };
}

async function readPm2Process(pm2Name) {
  const result = await runCommand("pm2", ["jlist"], { timeoutMs: 4000 });
  if (!result.ok) {
    return {
      manager: "pm2",
      name: pm2Name,
      ok: false,
      status: "unknown",
      error: result.error || result.stderr || "pm2 jlist failed"
    };
  }

  let list = [];
  try {
    list = JSON.parse(result.stdout || "[]");
  } catch (error) {
    return {
      manager: "pm2",
      name: pm2Name,
      ok: false,
      status: "unknown",
      error: `invalid pm2 jlist JSON: ${safeError(error)}`
    };
  }

  const processInfo = list.find((item) => item.name === pm2Name || item.pm2_env?.name === pm2Name);
  if (!processInfo) {
    return {
      manager: "pm2",
      name: pm2Name,
      ok: false,
      status: "missing",
      processCount: list.length
    };
  }

  const env = processInfo.pm2_env || {};
  return {
    manager: "pm2",
    name: pm2Name,
    ok: env.status === "online",
    status: env.status || "unknown",
    pid: processInfo.pid || env.pm_pid || null,
    restarts: env.restart_time || 0,
    unstableRestarts: env.unstable_restarts || 0,
    uptimeMs: env.pm_uptime ? Date.now() - env.pm_uptime : null,
    memoryBytes: processInfo.monit?.memory || 0,
    cpuPercent: processInfo.monit?.cpu || 0
  };
}

function parseSystemdShow(text = "") {
  const map = {};
  for (const line of String(text || "").split(/\r?\n/)) {
    const index = line.indexOf("=");
    if (index <= 0) continue;
    map[line.slice(0, index)] = line.slice(index + 1);
  }
  return map;
}

async function readSystemdUnit(unitName) {
  const result = await runCommand("systemctl", [
    "show",
    unitName,
    "--no-pager",
    "--property=Id,LoadState,ActiveState,SubState,MainPID,NRestarts,ExecMainStatus,ExecMainCode,FragmentPath,ActiveEnterTimestamp"
  ], { timeoutMs: 4000 });

  if (!result.ok) {
    return {
      manager: "systemd",
      name: unitName,
      ok: false,
      status: "unknown",
      error: result.error || result.stderr || "systemctl show failed"
    };
  }

  const data = parseSystemdShow(result.stdout);
  return {
    manager: "systemd",
    name: unitName,
    ok: data.ActiveState === "active" && data.SubState === "running",
    status: data.ActiveState || "unknown",
    subState: data.SubState || "unknown",
    loadState: data.LoadState || "unknown",
    pid: Number(data.MainPID || 0),
    restarts: Number(data.NRestarts || 0),
    execMainStatus: Number(data.ExecMainStatus || 0),
    execMainCode: Number(data.ExecMainCode || 0),
    fragmentPath: data.FragmentPath || "",
    activeSince: data.ActiveEnterTimestamp || ""
  };
}

async function buildOpsObservability({ backendRepoDir, frontendRepoDir, backendPm2Name, frontendServiceName }) {
  const [backendRepo, frontendRepo, backendRuntime, frontendRuntime] = await Promise.all([
    readRepoSnapshot("backend", backendRepoDir),
    readRepoSnapshot("frontend", frontendRepoDir),
    readPm2Process(backendPm2Name),
    readSystemdUnit(frontendServiceName)
  ]);

  const generatedAt = new Date().toISOString();
  return {
    generatedAt,
    repositories: {
      backend: backendRepo,
      frontend: frontendRepo
    },
    runtimes: {
      backend: backendRuntime,
      frontend: frontendRuntime
    },
    summary: {
      ok: backendRepo.ok && frontendRepo.ok && backendRuntime.ok && frontendRuntime.ok && !backendRepo.dirty && !frontendRepo.dirty,
      backendSha: backendRepo.shortSha,
      frontendSha: frontendRepo.shortSha,
      backendStatus: backendRuntime.status,
      frontendStatus: frontendRuntime.status,
      backendDirty: backendRepo.dirty,
      frontendDirty: frontendRepo.dirty
    }
  };
}

export { buildOpsObservability };
