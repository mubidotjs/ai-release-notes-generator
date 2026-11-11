import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const cli = fileURLToPath(
  new URL("../node_modules/playwright/cli.js", import.meta.url),
);
const browsers = fileURLToPath(new URL("../.cache/browsers", import.meta.url));
const child = spawn(process.execPath, [cli, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: browsers },
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
