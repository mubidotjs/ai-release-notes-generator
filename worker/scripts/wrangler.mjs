import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";

// Keep local tool state in this checkout; never change OS permissions or user configuration.
const configHome = fileURLToPath(new URL("../.cache/config", import.meta.url));
mkdirSync(configHome, { recursive: true });
const cli = fileURLToPath(
  new URL("../../node_modules/wrangler/bin/wrangler.js", import.meta.url),
);
const child = spawn(process.execPath, [cli, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: {
    ...process.env,
    XDG_CONFIG_HOME: configHome,
    WRANGLER_SEND_METRICS: "false",
    CI: "true",
  },
});
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
