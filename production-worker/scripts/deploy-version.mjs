import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "fad03f88124cd8f1979d1564faf4c026";
const SCRIPT_NAME = "breezy-cuts";
const BINDINGS = ["ASSETS", "DB", "ENVIRONMENT", "PUBLIC_SITE_URL", "SESSION_SECRET"];

async function loadToken() {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN;
  const configPaths = [
    join(homedir(), ".wrangler", "config", "default.toml"),
    join(homedir(), ".config", ".wrangler", "config", "default.toml")
  ];
  for (const configPath of configPaths) {
    try {
      const config = await readFile(configPath, "utf8");
      const token = config.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
      if (token) return token;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  throw new Error("Set CLOUDFLARE_API_TOKEN or sign in with Wrangler before deploying.");
}

async function cloudflareRequest(token, path, init) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers || {}) }
  });
  const body = await response.json();
  if (!response.ok || !body.success) {
    const detail = body.errors?.map((error) => error.message).join("; ") || `HTTP ${response.status}`;
    throw new Error(detail);
  }
  return body.result;
}

const deploy = process.argv.includes("--deploy");
const versionArgumentIndex = process.argv.indexOf("--version");
const existingVersion = versionArgumentIndex >= 0 ? process.argv[versionArgumentIndex + 1] : null;
if (versionArgumentIndex >= 0 && !existingVersion) throw new Error("--version requires a Worker version ID.");
const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const token = await loadToken();
let version = existingVersion ? { id: existingVersion } : null;

if (!version) {
  const source = await readFile(join(projectRoot, "src", "index.mjs"), "utf8");
  const metadata = {
    main_module: "index.mjs",
    compatibility_date: "2026-08-29",
    compatibility_flags: ["nodejs_compat"],
    keep_assets: true,
    bindings: BINDINGS.map((name) => ({ name, type: "inherit", version_id: "latest" })),
    annotations: {
      "workers/message": "Add crawlable route content and real 404 responses without replacing the booking app",
      "workers/tag": "seo-crawlable-pages-2026-08-29"
    }
  };
  const form = new FormData();
  form.append("metadata", JSON.stringify(metadata));
  form.append("index.mjs", new Blob([source], { type: "application/javascript+module" }), "index.mjs");
  version = await cloudflareRequest(
    token,
    `/accounts/${ACCOUNT_ID}/workers/scripts/${SCRIPT_NAME}/versions?bindings_inherit=strict`,
    { method: "POST", body: form }
  );
  console.log(JSON.stringify({ worker: SCRIPT_NAME, version: version.id, deployed: false }));
}

if (deploy) {
  const deployment = await cloudflareRequest(
    token,
    `/accounts/${ACCOUNT_ID}/workers/scripts/${SCRIPT_NAME}/deployments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        strategy: "percentage",
        versions: [{ version_id: version.id, percentage: 100 }],
        annotations: { "workers/message": "Publish crawlable Breezy Cuts pages and correct 404 handling" }
      })
    }
  );
  const settings = await cloudflareRequest(
    token,
    `/accounts/${ACCOUNT_ID}/workers/scripts/${SCRIPT_NAME}/script-settings`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        observability: {
          enabled: true,
          logs: { enabled: true, invocation_logs: true, persist: true, head_sampling_rate: 1 },
          traces: { enabled: true, persist: true, head_sampling_rate: 0.05 },
          redact_query_string: true
        }
      })
    }
  );
  console.log(JSON.stringify({ worker: SCRIPT_NAME, version: version.id, deployment: deployment.id, deployed: true }));
  console.log(JSON.stringify({ worker: SCRIPT_NAME, observability: settings.observability }));
}
