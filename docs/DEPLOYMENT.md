# Deployment runbook and verified status

The owner authorized publication to the existing GitHub repository and deployment of the disabled Worker and static frontend on 2026-11-11. GitHub publication, hosted CI, both deployments, exact-origin CORS, public synthetic exports, and native visitor throttling are verified. Both live flags remain false. Actual AI inference, billing changes, paid services, unrelated project changes, and DNS changes remain unauthorized.

| Verified target                      | Result                                                                                                                                  |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Repository                           | [mubidotjs/ai-release-notes-generator](https://github.com/mubidotjs/ai-release-notes-generator)                                         |
| Production frontend                  | [ai-release-notes-generator.vercel.app](https://ai-release-notes-generator.vercel.app)                                                  |
| Worker                               | [ai-release-notes-generator.mubikhan69.workers.dev](https://ai-release-notes-generator.mubikhan69.workers.dev)                          |
| Health                               | [Public `/health`](https://ai-release-notes-generator.mubikhan69.workers.dev/health): HTTP 200, exact Gemma model, `liveEnabled: false` |
| Plans                                | Cloudflare dashboard: **Free, $0, Current plan**. Vercel team dashboard: **Hobby**.                                                     |
| Worker version after CORS deployment | `bf450dae-0b40-4989-94a8-991d0ea47bcc`                                                                                                  |
| Initial Vercel production deployment | `dpl_5PzahUthwNjTG6ms6JfKWgYyEYe9`, READY, GitHub source commit `dbe2df4e411b1ad8aced58551cde69df5d7a16d8`                              |
| Live controls                        | `LIVE_AI_ENABLED=false`, `ABUSE_CONTROLS_VERIFIED=false`, read back from deployed bindings                                              |

No custom domain or DNS change was made. Vercel's existing deployment-protection configuration was retained; the canonical production URL above was verified with no cookies or authentication. Preview/hashed deployment URLs may remain protected.

## Free prerequisites and stop conditions

- A GitHub Free account and a new public `ai-release-notes-generator` repository, created/pushed only after approval. No GitHub token is used by the application.
- A personal Vercel **Hobby** account for static hosting; no Pro trial, paid integration, or backend Functions. This portfolio demonstration must remain personal/non-commercial under Hobby terms. [Hobby plan](https://vercel.com/docs/plans/hobby).
- A Cloudflare **Workers Free** account with Workers AI access. Do not subscribe to Workers Paid, attach a billing method for this project, buy credits, add AI Gateway billing, or accept an upgrade prompt.
- Verify the account plan in the dashboard and the model in current official documentation. On 2026-11-11 the preferred model is listed as free eligible. Documentation cannot establish account-specific availability. If it requires a card, upgrade, unsupported terms, or unavailable free protection, stop and keep demo-only operation. [Eligibility](https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/), [pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/).
- Use the exact model `@cf/google/gemma-4-26b-a4b-it`. There is no automatic or paid substitute.

## 1. GitHub and local release preparation

Published to the owner-created, empty public repository [mubidotjs/ai-release-notes-generator](https://github.com/mubidotjs/ai-release-notes-generator). The authenticated owner was verified as `mubidotjs`; no remote history was overwritten. Initial commit: [`dbe2df4e411b1ad8aced58551cde69df5d7a16d8`](https://github.com/mubidotjs/ai-release-notes-generator/commit/dbe2df4e411b1ad8aced58551cde69df5d7a16d8). Its [Quality checks run](https://github.com/mubidotjs/ai-release-notes-generator/actions/runs/43017214236) passed all steps, including installation, type checking, lint, unit/component tests, static/Worker dry-run builds, and browser tests.

Run `npm ci`, `npm run test:browser:install`, and `npm run check` on Node 24.22.1. The GitHub Actions workflow uses read-only repository permissions, mock dependencies, and no deployment secrets. Keep it as quality CI; do not add automatic Worker deployment or inference.

## 2. Deploy the Worker with inference disabled

Use the locally installed Wrangler version. The command wrapper stores CLI state inside this checkout and disables telemetry. From `worker/`, after owner approval:

```sh
node scripts/wrangler.mjs login
node scripts/wrangler.mjs deploy --env production
```

The first command opens Cloudflare authentication; the second creates/updates only the authorized Worker. Verify the dashboard account before deployment. If multiple Cloudflare accounts are available, specify the intended account ID in the production environment configuration before running the deploy command. An account ID is not an API key.

`worker/wrangler.jsonc` contains the production AI binding, native visitor/aggregate rate-limit bindings, and disabled flags:

| Setting                   | Initial production value                        |
| ------------------------- | ----------------------------------------------- |
| `LIVE_AI_ENABLED`         | `"false"`                                       |
| `ABUSE_CONTROLS_VERIFIED` | `"false"`                                       |
| `ALLOWED_ORIGINS`         | `https://ai-release-notes-generator.vercel.app` |
| `AI`                      | native Workers AI binding                       |
| `VISITOR_LIMITER`         | namespace `11001`, 2 attempts / 60 seconds      |
| `GLOBAL_LIMITER`          | namespace `11002`, 10 attempts / 60 seconds     |

Reserve the namespace IDs for this project; rate bindings sharing a namespace/account/location share counters. Change IDs if already used by another application. Missing binding support is a blocker, not a reason to subscribe to a paid plan.

The default local environment has no remote AI binding. The production environment is explicitly selected for the build dry run and eventual deploy. Avoid `wrangler dev --remote`, remote AI local-development bindings, or live model tests during Gates A–D.

Wrangler returned and public requests verified `https://ai-release-notes-generator.mubikhan69.workers.dev`. Deployment used the documented `production` environment and an explicit account selection for the owner-confirmed Free account. No temporary account, paid fallback, or inference call was used.

## 3. Deploy the static frontend to Vercel Hobby

After approval, import the public GitHub repository into a new personal Hobby project.

| Vercel setting     | Value                                                                       |
| ------------------ | --------------------------------------------------------------------------- |
| Root Directory     | repository root (`.`), not `web/`                                           |
| Framework          | Vite                                                                        |
| Node.js            | 24.x                                                                        |
| Install Command    | Version logging and Node 24 guard, then `npm ci` (exact command in `vercel.json`) |
| Build Command      | `npm run build -w web`                                                      |
| Output Directory   | `web/dist`                                                                  |
| Public environment | `VITE_WORKER_URL=https://ai-release-notes-generator.mubikhan69.workers.dev` |

The root `vercel.json` specifies these static build settings and security headers. Do not run the root `build` script on Vercel: it includes a Worker **local dry run**, unnecessary for static deployment. There are no Vercel API routes or Functions.

### Node version incident, 2026-11-11

Failed deployment `dpl_BoamwkP1utVtc7TGbg1UfLcNeTJj` belongs to a separate existing project, `ai-release-notes-generator-vulx` (`prj_nnYtIh0K5CiqD55seydRGECULXK6`). Its API reports Node `26.x`; its install log reports Node `v26.13.0`, npm `11.20.0`, and `EBADENGINE`. It built commit `42ddd8b46011abb9decf00c3a027ee92d3bf4604` from the repository root without a previous build cache or project environment overrides. The intended project, `ai-release-notes-generator` (`prj_E5hGf3OeleoadyDekWpJdp2h9Giz`), reports Node `24.x`, an empty root-directory setting (repository root), and successfully built that same commit. The reported settings discrepancy was between project identities. The duplicate project is left untouched.

Keep deployments and domain assignment scoped to the intended project ID. The committed install command now prints `node --version` and `npm --version`, rejects any Node major other than 24 before installation, then runs unchanged `npm ci`. Preserve `engines.node: "24.x"` and `engine-strict=true`. Explicitly select `nodeVersion: "24.x"` when creating a deployment. No engine bypass, alternate dependency resolution, or Node range widening is permitted. The `cache-dir` warning also occurred in the successful deployment and is nonfatal; no repository setting defines it and no global configuration was changed.

`VITE_WORKER_URL` is compiled into public assets. It is a public URL, never a secret. Rebuild the frontend after changing it. The CSP permits HTTPS `*.workers.dev` API connections; tighten it to the exact Worker host before final public launch if desired. A custom API hostname would require a matching explicit CSP change and separate DNS authorization.

Leave live AI disabled. Confirm the real frontend URL from Vercel, then set production `ALLOWED_ORIGINS` to that exact origin and redeploy the authorized Worker. Do not wildcard all Vercel preview origins. Add a specific preview origin only when intentionally testing it. Include local development origins only in local configuration unless deliberately needed in production.

## 4. Verify protection without inference

After deployment authorization, check `/health`: expect `status: "ok"`, the exact model, and `liveEnabled: false`.

Send valid comparison requests to the disabled production endpoint. The production handler exercises its native limiters first and returns `LIVE_AI_DISABLED` without fetching GitHub or calling AI. Repeated requests from the same visitor/location should eventually return `429 RATE_LIMITED` with `Retry-After`. Do not treat the threshold as exact: counters are approximate. Verify aggregate binding configuration separately and retain the documented per-location limitation.

Use the frontend origin to check the exact `Access-Control-Allow-Origin` response, an unrelated Origin to check rejection, and a non-browser request without Origin to confirm CORS is not access control. Validate the deployed static CSP and other headers. Confirm demo mode works while the API is disabled or unavailable.

If native controls cannot be confirmed on Workers Free, leave both flags false. Do not replace them with in-memory counters, CORS-only checks, a public shared secret, or a paid service. Do not claim a strict worldwide cap. Cloudflare's daily free allocation is shared account-wide and may be exhausted by other projects or distributed abuse.

## 5. Separately authorized live verification — Gate E

This step is unauthorized under the current task. Only after explicit owner approval, confirmed free eligibility, deployed protection checks, and owner acceptance of approximate limits:

1. Set `ABUSE_CONTROLS_VERIFIED` and `LIVE_AI_ENABLED` to `"true"` in the approved production configuration and deploy the Worker. Leave the committed baseline disabled unless separately agreed. No payment credentials are needed.
2. Confirm `/health` now reports ready. Complete one small real public comparison through the deployed browser. Inspect category text, exact excerpts, all source links, coverage, and Markdown copy/download.
3. Send a nonexistent head ref and confirm a meaningful failure with no fabricated output. Verify no inference happens for invalid comparisons through the authorized provider/runtime observability available on Free.
4. Record actual URL, date, model, source SHAs, observed success/failure, and limitations in the evaluation document. Never infer a passed Gate E from mocked tests or `/health` alone.

Cloudflare errors `3036` (daily free allocation), `3040` (capacity), `5035` (paid plan required), and model deprecation map to application failures, with no retry loop or paid fallback. No test should deliberately exhaust the entire account allocation. [Provider error reference](https://developers.cloudflare.com/workers-ai/platform/errors/).

## Smoke testing and rollback

For release smoke checks, verify static assets and headers, `/health`, disabled/enabled state as authorized, demo labeling, a small comparison, one failure, source links, and export. Do not claim whole-account usage, distributed rate-limit effectiveness, real model accuracy, or production scale from a single check.

To stop inference after a separately authorized launch, set `LIVE_AI_ENABLED` back to `"false"` in the approved configuration and redeploy. Demo remains available. Restore the prior verified frontend deployment in Vercel if UI regression occurs. For Worker rollback, redeploy the last verified source with live inference disabled first. Never roll back into a version whose live flags or protections are unknown. Remote rollback is also an owner-authorized mutation.

There are no remaining blockers for the authorized public synthetic/demo deployment. Actual inference remains outside this authorization; deployment and disabled-endpoint verification do not establish a passed live-inference Gate E. Before any future enablement, recheck model Free-plan eligibility, review the approximate limiter/aggregate-verification limitations, obtain explicit owner authorization, then perform the successful generation and failure-path checks in section 5.
