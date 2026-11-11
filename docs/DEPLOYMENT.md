# Deployment readiness — owner authorization required

No commands in this document have been used to create remote resources. Gates A–D stop at local verification. Gate E, remote repository creation/push, deployments, live enablement, account changes, and DNS changes require separate explicit owner authorization. No domain or DNS change is required: use free `vercel.app` and `workers.dev` URLs.

## Free prerequisites and stop conditions

- A GitHub Free account and a new public `ai-release-notes-generator` repository, created/pushed only after approval. No GitHub token is used by the application.
- A personal Vercel **Hobby** account for static hosting; no Pro trial, paid integration, or backend Functions. This portfolio demonstration must remain personal/non-commercial under Hobby terms. [Hobby plan](https://vercel.com/docs/plans/hobby).
- A Cloudflare **Workers Free** account with Workers AI access. Do not subscribe to Workers Paid, attach a billing method for this project, buy credits, add AI Gateway billing, or accept an upgrade prompt.
- Verify the account plan in the dashboard and the model in current official documentation. On 2026-11-11 the preferred model is listed as free eligible. Documentation cannot establish account-specific availability. If it requires a card, upgrade, unsupported terms, or unavailable free protection, stop and keep demo-only operation. [Eligibility](https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/), [pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/).
- Use the exact model `@cf/google/gemma-4-26b-a4b-it`. There is no automatic or paid substitute.

## 1. GitHub and local release preparation

After explicit approval, create the empty public repository, initialize/commit this checkout if necessary, set the authorized remote, and push. Do not perform those steps under Gates A–D. The intended owner is `mubidotjs`; update attribution if the authorized destination differs.

Run `npm ci`, `npm run test:browser:install`, and `npm run check` on Node 24.22.1. The GitHub Actions workflow uses read-only repository permissions, mock dependencies, and no deployment secrets. Keep it as quality CI; do not add automatic Worker deployment or inference.

## 2. Deploy the Worker with inference disabled

Use the locally installed Wrangler version. The command wrapper stores CLI state inside this checkout and disables telemetry. From `worker/`, after owner approval:

```sh
node scripts/wrangler.mjs login
node scripts/wrangler.mjs deploy --env production
```

The first command opens Cloudflare authentication; the second creates/updates only the authorized Worker. Verify the dashboard account before deployment. If multiple Cloudflare accounts are available, specify the intended account ID in the production environment configuration before running the deploy command. An account ID is not an API key.

`worker/wrangler.jsonc` contains the production AI binding, native visitor/aggregate rate-limit bindings, and disabled flags:

| Setting                   | Initial production value                           |
| ------------------------- | -------------------------------------------------- |
| `LIVE_AI_ENABLED`         | `"false"`                                          |
| `ABUSE_CONTROLS_VERIFIED` | `"false"`                                          |
| `ALLOWED_ORIGINS`         | exact frontend origin, comma-separated if multiple |
| `AI`                      | native Workers AI binding                          |
| `VISITOR_LIMITER`         | namespace `11001`, 2 attempts / 60 seconds         |
| `GLOBAL_LIMITER`          | namespace `11002`, 10 attempts / 60 seconds        |

Reserve the namespace IDs for this project; rate bindings sharing a namespace/account/location share counters. Change IDs if already used by another application. Missing binding support is a blocker, not a reason to subscribe to a paid plan.

The default local environment has no remote AI binding. The production environment is explicitly selected for the build dry run and eventual deploy. Avoid `wrangler dev --remote`, remote AI local-development bindings, or live model tests during Gates A–D.

Use the resulting `https://ai-release-notes-generator.<account-subdomain>.workers.dev` URL only after Wrangler actually returns it. No verified URL exists yet.

## 3. Deploy the static frontend to Vercel Hobby

After approval, import the public GitHub repository into a new personal Hobby project.

| Vercel setting     | Value                                                        |
| ------------------ | ------------------------------------------------------------ |
| Root Directory     | repository root (`.`), not `web/`                            |
| Framework          | Vite                                                         |
| Node.js            | 24.x                                                         |
| Install Command    | `npm ci`                                                     |
| Build Command      | `npm run build -w web`                                       |
| Output Directory   | `web/dist`                                                   |
| Public environment | `VITE_WORKER_URL=https://<verified-worker-host>.workers.dev` |

The root `vercel.json` specifies these static build settings and security headers. Do not run the root `build` script on Vercel: it includes a Worker **local dry run**, unnecessary for static deployment. There are no Vercel API routes or Functions.

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

Current blockers to public launch: separate authorization; account authentication and Free-plan confirmation; remote repository push; verified Vercel/Worker URLs and CORS; deployed binding/protection verification; actual inference and failure-path verification. None blocks local Gates A–D work.
