# AI Release Notes Generator

Turn a public GitHub comparison into concise, categorized release notes with source commit links and supporting excerpts. React and TypeScript provide the interface; a Cloudflare Worker retrieves commits and calls Workers AI through its native binding.

**Live application: [release-notes.mubashirhussain.dev](https://release-notes.mubashirhussain.dev).** The original [vercel.app URL](https://ai-release-notes-generator.vercel.app) also works. One real Gemma generation through the branded frontend, source evidence, Markdown copy/download, and an invalid-reference failure were verified on 2026-11-11. **Try Demo** remains a clearly labeled synthetic workflow with no inference. See [evaluation results](docs/EVALUATION.md) for evidence and limitations.

## Features

- Compare public GitHub branches, tags, or SHAs using the unauthenticated REST compare endpoint.
- Process at most 20 commits, with explicit partial-coverage and shortened-message warnings.
- Generate features, fixes, improvements/refactoring, supported breaking changes, and other meaningful changes; omit empty categories.
- Check strict model output against retrieved full SHAs and exact evidence excerpts. Reject invalid output instead of fabricating success.
- Review formatted notes and Markdown source, copy Markdown, or download a `.md` file.
- Try a clearly labeled synthetic example without network access or inference.
- Responsive layouts, accessible labels, keyboard navigation, visible focus states, and safe text rendering.
- Bounded requests, prompts, output tokens, timeouts, approximate edge throttles, and clear quota failures. No paid fallback.

For portfolio screenshots, run the app, choose **Try Demo**, and capture the comparison form alongside the notes at desktop and mobile sizes. Keep the **DEMO DATA** badge and synthetic-data notice visible. Do not present screenshots of fixtures as live inference.

## Architecture and stack

```text
Browser → React/Vite static frontend (Vercel Hobby)
        → POST /api/generate (Cloudflare Worker)
        → public GitHub compare API → Workers AI binding
        → schema + source checks → structured notes + Markdown

Try Demo → bundled synthetic fixture → same formatting/grounding code
```

React 19, TypeScript 6, Vite 8, Zod 4, Wrangler 4, Vitest 5, Testing Library, Playwright Chromium, axe, npm workspaces. Node is tooling only; the deployed Worker runs in Cloudflare's `workerd` runtime. No database, authentication, commercial model SDK, or Vercel backend.

```text
web/                 React UI, CSS, API client, export helpers
worker/              Worker routes, GitHub adapter, Workers AI adapter, Wrangler config
shared/              Schemas, types, grounding checks, Markdown formatting
fixtures/            Synthetic commits and deterministic demo output
tests/browser/       Responsive and accessibility smoke tests
docs/                Architecture, deployment, evaluation
.github/workflows/   Credential-free quality checks
```

## Local setup

Use Node.js **24.22.1** and npm 11+. Clone the public repository, or open the supplied checkout. Run from the repository root:

```sh
npm ci --cache .npm-cache
npm run dev
```

Open `http://127.0.0.1:5400`. The local Worker listens on `http://127.0.0.1:8787`. Choose **Try Demo** for a working offline example. Generate against the local default Worker returns `LIVE_AI_DISABLED` by design. Local development has no remote AI binding and needs no Cloudflare login.

The frontend uses port **5400** because this Windows host excludes ports **5141–5240**, including Vite's default 5173 and alternative 5180. A reserved port can return `listen EACCES` without an active listener. Inspect with `netsh interface ipv4 show excludedportrange protocol=tcp` (and `ipv6`) and `netstat -ano -p tcp`. Vite uses `strictPort` so it cannot silently move to an origin outside the Worker's local CORS allowlist. If another port is needed, first check that it binds, then update `server.port` in `web/vite.config.ts` and only the default local `ALLOWED_ORIGINS` in `worker/wrangler.jsonc` together. Do not remove Windows port exclusions or run as Administrator.

If only the UI is needed, use `npm run dev -w web`. Optional public configuration is shown in `web/.env.example`; copy it to `web/.env.local` only to change the Worker URL. Never put credentials in `VITE_*` variables.

The npm `EACCES` encountered in the Codex restricted process was a network-access restriction, not evidence of corrupt packages. Registry access worked with scoped network execution and a checkout-local cache. Do not use administrator privileges, `sudo`, recursive cache deletion, or permission changes as a workaround. The Wrangler wrapper stores local configuration/logs under `worker/.cache/` and disables telemetry.

Wrangler/Playwright upstream support targets Windows 11+ or a supported Linux/macOS host. This Windows 10 checkout passed the observed checks, including a local Worker health check, but that does not extend upstream OS support.

## Test and build

```sh
npm run test:browser:install
npm run typecheck
npm run lint
npm test
npm run build
npm run test:browser
```

`npm run check` runs the checks in sequence after installing Chromium. The browser installer stores binaries in `.cache/browsers/`. It does not install system packages; on Linux use a supported host with Chromium dependencies already available (GitHub's Ubuntu runner provides these).

The Worker build is **`wrangler deploy --dry-run`**, which bundles locally and does not deploy. The frontend output is `web/dist/`; the Worker dry-run output is `worker/dist/`. CI uses mocks and synthetic data, without Cloudflare credentials or inference. [GitHub-hosted quality checks](https://github.com/mubidotjs/ai-release-notes-generator/actions/workflows/ci.yml) passed on the published implementation.

## Demo and live modes

**Demo:** Bundled synthetic commits and deterministic output, always labeled. Its identifiers use `DEMO-N`; they deliberately do not link to fictitious GitHub commits. Demo notes preserve their label when copied/downloaded. The demo comparison is an illustration, not a verified public repository.

**Live implementation:** The Worker uses `@cf/google/gemma-4-26b-a4b-it` only through `env.AI.run()`. The input/output configuration is centralized in the shared limits and Worker AI adapter, and checked against the installed official model types. No external model API key is required. No model or provider substitution is configured.

Cloudflare documentation checked on **2026-11-11** lists this model as available on Workers Free. Workers Free includes 10,000 neurons per day, shared across the account; requests fail after exhaustion. The signed-in account remains on Workers Free, and one actual model call through the native binding succeeded. Recheck eligibility before future configuration changes. [Model eligibility](https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/), [pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/).

Live enablement requires both `LIVE_AI_ENABLED` and `ABUSE_CONTROLS_VERIFIED`, native AI/rate-limit bindings, and trusted visitor identity. The owner authorized production activation after deployed Free-plan/protection checks. Production flags are `true` in committed and deployed configuration; default local development and credential-free tests remain disabled/mocked. Only the branded and original production frontend origins are allowed. Public visitor throttling was observed; counters remain approximate and location-local. See [deployment instructions](docs/DEPLOYMENT.md).

## Demonstration script

1. Open the app and choose **Try Demo**. Point out the demo badge and “no live inference” notice.
2. Inspect `v1.2.0 → v1.3.0`, categorized entries, exact supporting excerpts, and synthetic source identifiers.
3. Switch to Markdown, copy it, and download the labeled `.md` file.
4. For the verified live example, compare `https://github.com/mubidotjs/ai-release-notes-generator`, base `42ddd8b46011abb9decf00c3a027ee92d3bf4604`, head `d533970dfe710836cb2c17fd4382e2159a8a3bc5`. This is a one-commit comparison about verifying Node 24 before Vercel dependency installation. Revalidate refs and respect the 60-second visitor window before another request.
5. Follow a real source SHA link, compare the note against the commit message, export Markdown, and show a meaningful failure using a nonexistent head ref. Explain any partial-coverage warning.

## Limitations

- Grounding is based on commit messages, not code diffs. Valid SHA/excerpt checks do not prove semantic entailment or that a claimed code change actually works. Human review is required.
- Prompt separation and output checks reduce injection risk; mocked adversarial tests are not proof that a real model resists every attack.
- Only the first 20 chronological commits are processed. Long messages are shortened. Branches/tags can move between generations; use SHAs for reproducibility.
- GitHub's unauthenticated limit is generally 60 requests/hour per originating IP, potentially shared across visitors/Cloudflare egress. Errors expose a retry delay when available. [GitHub limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api).
- Rate-limit bindings are approximate and independent per Cloudflare location. The aggregate key is not a strict worldwide counter, and distributed abuse can exhaust the free account allocation. CORS is not authentication. [Cloudflare rate limits](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).
- Inference deadlines bound response waiting; the binding does not document cancellable provider compute. No automatic retry occurs.
- Clipboard access needs a secure browser context and permission. Markdown remains selectable if copying fails.
- The public synthetic workflow and one real model generation are verified. A single successful example does not establish general output quality, model reliability, latency guarantees, or distributed abuse resistance. The aggregate limiter was configured/read back but not exhausted with multiple public visitors. Vercel Hobby is for personal/non-commercial projects. No scale or accuracy measurements are claimed.

Built by Mubashir Hussain. Source: [mubidotjs/ai-release-notes-generator](https://github.com/mubidotjs/ai-release-notes-generator). The [initial published commit](https://github.com/mubidotjs/ai-release-notes-generator/commit/dbe2df4e411b1ad8aced58551cde69df5d7a16d8) passed [GitHub Actions](https://github.com/mubidotjs/ai-release-notes-generator/actions/runs/43017214236).
