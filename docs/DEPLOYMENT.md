# Deployment runbook and verified status

The owner explicitly authorized the custom subdomain, GitHub pushes, related redeployments and production live AI activation on 2026-11-11, conditional on Free-plan and safeguard checks. Those prerequisites and one real generation plus an invalid-reference failure passed. Paid services, billing changes and unrelated production changes remain prohibited.

## Verified production targets

| Target                                          | Verified value                                                                                            |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Canonical frontend                              | https://release-notes.mubashirhussain.dev                                                                 |
| Original frontend                               | https://ai-release-notes-generator.vercel.app                                                             |
| Repository                                      | https://github.com/mubidotjs/ai-release-notes-generator                                                   |
| Verified implementation SHA                     | 8510729fbc232e773bbc0628b2d4112669c55cf7                                                                  |
| Implementation CI                               | [43028754575 — success](https://github.com/mubidotjs/ai-release-notes-generator/actions/runs/43028754575) |
| Vercel project                                  | ai-release-notes-generator — prj_E5hGf3OeleoadyDekWpJdp2h9Giz                                             |
| Vercel production deployment at live acceptance | dpl_6QjLSUAEwGL1XUzcCdZZrJn1mJpt — READY                                                                  |
| Worker                                          | https://ai-release-notes-generator.mubikhan69.workers.dev                                                 |
| Worker version                                  | 1ba23e75-f224-433e-b341-04e6751cc3d0                                                                      |
| Health                                          | /health — HTTP 200, liveEnabled true, exact Gemma model                                                   |
| Plans                                           | Signed-in dashboards: Workers Free, $0 Current plan; Vercel Hobby                                         |

The documentation-only handoff revision and its Vercel deployment are identifiable from [main history](https://github.com/mubidotjs/ai-release-notes-generator/commits/main). Resolve the checkout's exact revision with git rev-parse HEAD; the implementation SHA above identifies the code used for the real acceptance test. No account authentication state, private DNS snapshots or credentials are committed.

## Free prerequisites and stop conditions

Use GitHub Free, Vercel personal Hobby static hosting, Cloudflare Workers Free and its account-wide free AI allocation. No card, trial, subscription, paid model fallback, commercial model API key, AI Gateway billing, database or Vercel backend is required or permitted. Hobby use must remain personal/non-commercial. [Vercel Hobby](https://vercel.com/docs/plans/hobby).

Current official documentation checked on 2026-11-11 explicitly lists @cf/google/gemma-4-26b-a4b-it as available on Workers Free. Actual native inference succeeded on the owner's Free account. The daily 10,000-neuron allocation is account-wide; exhausted requests fail. Recheck eligibility before future model/configuration changes. If access requires payment, unsupported terms, or unavailable safeguards, disable live generation and preserve the synthetic demo. Never change models or plans automatically. [Model eligibility](https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/), [pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/).

## Local and GitHub verification

Use Node 24.22.1 and npm 11+. Run npm ci, npm run test:browser:install, then npm run check. The existing workflow runs credential-free mocked unit/component/browser tests and frontend/Worker dry-run builds. It does not deploy Workers or invoke AI. Keep engine-strict=true and engines.node 24.x. Before a push, inspect git status/diff and tracked paths for secrets, caches and generated files; the existing ignore rules cover them. Never overwrite unrelated history or force-push.

Latest local code verification passed typecheck, lint, 110 unit/component tests, both production builds and 9 desktop/tablet/mobile browser tests. A local workerd experiment also reproduced the unsupported redirect mode and confirmed manual mode; it made no external or AI calls. The real production checks are separately recorded in [evaluation](EVALUATION.md).

## Existing Cloudflare Worker

Run the installed wrapper from worker/, only with owner-authorized account access:

```sh
node scripts/wrangler.mjs login
node scripts/wrangler.mjs deploy --env production
```

Login is needed only when authentication is missing/expired. The wrapper keeps CLI state in ignored checkout-local storage and disables telemetry. Explicitly select the verified account with CLOUDFLARE_ACCOUNT_ID when required; an account ID is not a credential. Do not print OAuth tokens. Never create another Worker or use remote development inference as a substitute for verification.

worker/wrangler.jsonc is the reproducible approved configuration:

| Setting                 | Effective production value                                                              |
| ----------------------- | --------------------------------------------------------------------------------------- |
| LIVE_AI_ENABLED         | true                                                                                    |
| ABUSE_CONTROLS_VERIFIED | true                                                                                    |
| ALLOWED_ORIGINS         | https://release-notes.mubashirhussain.dev,https://ai-release-notes-generator.vercel.app |
| Model                   | @cf/google/gemma-4-26b-a4b-it, native env.AI.run only                                   |
| AI                      | Native Workers AI binding                                                               |
| VISITOR_LIMITER         | Namespace 11001; 2 attempts / 60 seconds                                                |
| GLOBAL_LIMITER          | Namespace 11002; 10 attempts / 60 seconds per location                                  |

The deployed settings API was read back to verify these values and bindings. Namespace IDs are reserved for this project: the same account/namespace/location shares counters. Default local vars remain false/false, with only localhost:5400 and 127.0.0.1:5400 allowed and no remote AI binding. Tests inject mocks. A root npm run build includes a local Wrangler production dry run; it never deploys or calls inference.

## Existing Vercel Hobby project

Keep deployments scoped to project prj_E5hGf3OeleoadyDekWpJdp2h9Giz in the existing personal Hobby team. Do not import a new project. The Git integration builds main after authorized pushes.

| Setting                       | Value                                                                     |
| ----------------------------- | ------------------------------------------------------------------------- |
| Root Directory                | Repository root (empty project setting / .)                               |
| Framework                     | Vite                                                                      |
| Node.js                       | 24.x                                                                      |
| Install                       | Exact version-printing Node 24 guard in root vercel.json, then npm ci     |
| Build                         | npm run build -w web                                                      |
| Output                        | web/dist                                                                  |
| Production public environment | VITE_WORKER_URL=https://ai-release-notes-generator.mubikhan69.workers.dev |

VITE_WORKER_URL is intentionally public and compiled into the static assets. Rebuild if it changes; never put credentials in a VITE variable. Do not run the root build on Vercel or add API routes/Functions. Existing deployment protection was retained; the canonical production domains are publicly accessible. Hashed/preview URLs may remain protected and are intentionally absent from Worker CORS.

### Node version incident and correction

Failed dpl_BoamwkP1utVtc7TGbg1UfLcNeTJj belongs to the separate existing project ai-release-notes-generator-vulx (prj_nnYtIh0K5CiqD55seydRGECULXK6). Its API reports Node 26.x, and its install log showed v26.13.0 / npm 11.20.0 with EBADENGINE. It built commit 42ddd8b46011abb9decf00c3a027ee92d3bf4604 at the repository root without a previous cache or project environment overrides. The intended project reports Node 24.x, no root subdirectory, and successfully built that same SHA. The apparent contradictory setting was a project-identity mismatch. The duplicate project was inspected only and left untouched.

The root vercel.json now prints node --version and npm --version, rejects a Node major other than 24 before installation, then runs unchanged npm ci. No force flag, engine-check bypass or range widening was used. Restored production dpl_ASujbBY9NMtECUQGtLma1kogvVax, commit d533970dfe710836cb2c17fd4382e2159a8a3bc5, explicitly logged Node v24.22.2 and npm 11.19.1 before installation and became READY; CI 43026503840 passed. Local Node remains 24.22.1. Vercel rolls out patch versions within the selected major.

The nonfatal cache-dir npm warning also appeared in the successful build. No repository setting defines it, no project environment override causes it, and no unrelated global configuration was changed.

## Dynadot custom subdomain

The authenticated ChatGPT internal-browser Dynadot session was actually accessible. Public NS lookup confirmed ns1.dyna-ns.net and ns2.dyna-ns.net. DNS management mode remains Dynadot DNS. The existing Vercel project's domain API assigned this exact record; no target was guessed:

| Host          | Type  | Target                              | TTL                        |
| ------------- | ----- | ----------------------------------- | -------------------------- |
| release-notes | CNAME | 5d207830601f1338.vercel-dns-017.com | Existing default 5 minutes |

Vercel ownership was already verified; no TXT challenge was required. Only that new row was added in the existing Subdomain Records form. Existing field values were compared before save and all record types/values were checked after reopening. Apex, www, portfolio hosting, MX, SPF, DKIM, DMARC, other TXT, webhooks, registration settings and nameservers were preserved. Before/after account UI snapshots remain in ignored local .cache for incident recovery, not public artifacts.

Public DNS propagation initially differed by resolver. It subsequently resolved normally in the local system and internal browser. Vercel reports verified association, no conflicts and misconfigured false. Normal HTTPS certificate validation and HTTP 200 passed; no warning was bypassed. Both canonical frontend URLs work. The HTML canonical URL points to the new hostname; CSP and the Worker URL remain unchanged.

For future DNS edits, inspect the complete existing form first, check conflicts, change only the explicitly authorized row, compare all existing values before saving, then reopen and check public DNS/HTTPS. Never replace the zone, switch DNS mode or change nameservers.

## Protection and live acceptance evidence

Before activation, native AI and both limiters were deployed/read back on Workers Free. The public disabled handler exercised trusted CF-Connecting-IP identity and both limiter success paths, returning LIVE_AI_DISABLED without GitHub/model calls. Attempts 1–3 returned 503, attempt 4 returned 429 RATE_LIMITED with Retry-After 60 at location ISB. After activation, repeated nonexistent-ref requests similarly returned 404 three times then 429, without further AI calls. Both approved CORS Origins work, OPTIONS succeeds, and unrelated Origins receive 403 without an allow-origin header.

Native counters are approximate and location-scoped. The aggregate key is not a strict worldwide quota; no distributed real-visitor aggregate stress test was performed. Its deployed configuration/success path and mocked denial are verified. Missing bindings, unverified controls, absent trusted identity and limiter exceptions fail closed in tests. Production bindings were not deliberately removed to create an outage. The owner accepts these limitations; distributed abuse or other projects can exhaust the account-wide free allocation. [Native semantics](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).

One actual browser submission on the branded URL compared 42ddd8b46011abb9decf00c3a027ee92d3bf4604 to d533970dfe710836cb2c17fd4382e2159a8a3bc5 in this public repository. The Worker retrieved one commit, called native Gemma, validated structured output and returned HTTP 200. The UI showed LIVE AI DRAFT, a supported Bug fixes entry and matching full SHA/excerpt; Markdown preview, copy via actual paste, and byte-identical download passed. A nonexistent head produced HTTP 404 REPOSITORY_UNAVAILABLE with no fabricated notes; GitHub failure exits before inference. Synthetic demo recovery, mobile layout/labels, both URLs and headers passed. See [evaluation](EVALUATION.md) for the exact output and honest limits. No accuracy or scale claim follows from this example.

## Failure handling and rollback

The first live request exposed a real Workers runtime incompatibility: redirect:error throws immediately. Live was disabled at once (version 6f58749b-56df-41c6-989e-a0699cabc4c0), health false verified, and DNS retained. The adapter now uses supported manual mode and rejects all 3xx responses before AI, with five redirect regression cases. Full checks passed before corrected activation. Fixed fetch destinations and SSRF protections were preserved. [Cloudflare Request behavior](https://developers.cloudflare.com/workers/runtime-apis/request/).

For a serious runtime/model/safeguard problem, payment requirement, or owner stop request:

1. Set only production LIVE_AI_ENABLED to false in the tracked configuration and deploy the existing Worker. Preserve the approved origins, native bindings and verification state unless the safeguards themselves are invalid.
2. Check /health returns liveEnabled false; verify the public synthetic demo and exports still work. Commit the rollback so subsequent deployments reproduce it.
3. Preserve the custom CNAME and Vercel association. Do not change models, buy usage, activate billing or switch DNS providers.
4. For a frontend regression, restore a known READY deployment on the same Vercel project. Pre-activation CORS Worker version 50b41bcf-1030-4d96-a2f6-2b50d1142b55 had both flags false; never restore any version without checking its effective flags and bindings.
5. If an unrelated DNS record was accidentally affected, restore only that record from the verified before-change state. Removing the new release-notes CNAME is not necessary for model failure and is not the normal rollback.

Quota (3036), capacity (3040), paid-plan-required (5035), deprecation and timeout failures are safe application errors with no paid fallback or retry loop. Do not deliberately exhaust quota to test them. [Provider errors](https://developers.cloudflare.com/workers-ai/platform/errors/).
