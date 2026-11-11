# Evaluation and observed results

Evaluation date: **2026-11-11**. Host: Windows 10, Node.js **24.22.1**, npm **11.16.0**. This document distinguishes local evidence from deployment/inference evidence. No Cloudflare account was authenticated, no public resource was deployed, and no real model inference was performed.

## Verification results

| Check                                                          | Observed result                                        | Boundary                                                                                          |
| -------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `npm install --cache .npm-cache`                               | Passed using scoped network execution                  | Local dependencies; no permissions weakened                                                       |
| `npm run typecheck`                                            | Passed                                                 | Strict TypeScript, including official model input types                                           |
| `npm run lint`                                                 | Passed with zero warnings                              | Authored source/configuration; tool caches excluded                                               |
| `npm test`                                                     | **105 passed**, 3 test files                           | Actual application pipeline with mock GitHub, AI, and limiter dependencies; JSDOM component tests |
| `npm run build`                                                | Passed                                                 | Vite static build and Wrangler production **dry run**, not deployment                             |
| `npm run test:browser`                                         | **9 passed**, desktop/tablet/mobile Chromium           | Real local browser; fixture demo and mocked HTTP generation success/failure                       |
| axe WCAG A/AA/2.1 AA scan                                      | No violations in tested demo states at all three sizes | Automated accessibility basics, not a complete accessibility audit                                |
| `npm audit --omit=dev`                                         | No reported production dependency vulnerabilities      | npm advisory snapshot; not a security guarantee                                                   |
| Local `workerd` `/health`                                      | HTTP 200; `liveEnabled: false`; exact configured model | Real local Worker runtime, no AI/GitHub calls                                                     |
| Public unauthenticated GitHub compare                          | HTTP 200; `ahead`; 2 total/returned commits            | Real external GitHub API, no inference                                                            |
| Built Worker handler + real public GitHub + mocked AI/limiters | HTTP 200; 2 sources; 1 entry; correct source URL       | Node import of actual Worker bundle, **not** deployed Cloudflare or real inference                |
| Cloudflare deployed endpoints/inference                        | **Not run**                                            | Gate E unauthorized                                                                               |
| GitHub-hosted Actions / Vercel deployment                      | **Not run**                                            | Workflow/config prepared only; no remote repository or push                                       |

The clean lockfile installation `npm ci --offline --cache .npm-cache` also passed, installing 296 packages from the existing cache after local preview processes were stopped. No permission change or remote account operation was needed.

Additional real local Worker requests returned HTTP 503 `LIVE_AI_DISABLED` for generation, echoed the exact configured development origin in CORS headers, and rejected an unrelated origin with HTTP 403. These requests made no inference calls.

The request-protection tests include a disabled-production branch that exercises mocked limiter bindings and confirms zero GitHub/model calls. Neither this test nor a successful dry run verifies native deployed limiter effectiveness or Free-plan eligibility for a specific account.

The local checkout is initialized as an empty Git repository with no remote and no commits. No account, billing configuration, DNS, unrelated project, or public deployment was changed.

## Windows development port correction (2026-11-11)

- Reproduced the original `npm run dev -w web` failure: `listen EACCES: permission denied 127.0.0.1:5173`. `netstat -ano -p tcp` showed no listener on 5173 or 5180. Both IPv4 and IPv6 TCP exclusion lists from `netsh` include **5141–5240**; direct Node bind probes returned `EACCES` for both ports. Port **5400** bound successfully. No Windows exclusions, firewall rules, privileges, or permissions were changed.
- Set only Vite's development server to loopback port 5400 with `strictPort: true`, and changed the default local Worker allowlist to the exact localhost/127.0.0.1 origins on 5400. The Worker URL remains 8787. The production environment block, Vercel configuration, and lockfile were verified byte-for-byte unchanged using SHA-256 hashes.
- `npm run dev` reported Vite ready at `http://127.0.0.1:5400/` and Wrangler ready at `http://127.0.0.1:8787`. A pre-existing checkout-local Worker was already listening on 8787; it was left running after Windows denied a standard-user stop attempt. No Administrator execution was used.
- A separate Chromium probe on **5400**, without HTTP mocks, received frontend/Worker health HTTP 200 and the exact new CORS origin, displayed labeled demo notes and Markdown, and sent **zero generation requests during Try Demo**. No page/console errors or unexpected network failures occurred. React StrictMode intentionally aborted its first health-effect request; the subsequent request succeeded. An initial overly strict probe assertion counted this expected abort as a failure; the corrected probe passed without application changes.
- The same real local browser subsequently submitted Generate, received HTTP **503 `LIVE_AI_DISABLED`** through CORS, and rendered the disabled-service message. Direct local requests accepted both configured 5400 origins and rejected the old 5173 and lookalike origins with HTTP 403. These checks made no GitHub or AI calls.
- `npm run check` exited **0**: type checking and lint passed, **105 unit/component tests passed**, Vite production build and Wrangler production **dry run** passed, and **9 desktop/tablet/mobile browser tests passed**. The browser suite uses synthetic fixtures and mocked HTTP generation. Its Windows test-server teardown stalled after all tests completed; stopping only that run's Vite process (PID 928) allowed the runner to finish successfully. No tooling or security configuration was changed to address teardown.

## Synthetic evaluation cases

| Case family                       | Fixture or intervention                                                                                | Expected and observed local behavior                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Valid inputs                      | HTTPS repository, `.git`/trailing slash, branches/tags/SHAs, slash refs                                | Accepted and normalized; slash refs encoded into fixed API path                             |
| Invalid inputs / SSRF             | Lookalike hosts, credentials, ports, extra paths, metadata IP, malformed refs, unknown fields          | Rejected before external operations                                                         |
| Private/unavailable repository    | Mock 404                                                                                               | Meaningful unavailable error; no model call                                                 |
| Empty comparison                  | Identical/behind, no commits                                                                           | `NO_CHANGES`; no model call                                                                 |
| Large comparison                  | 35 total, 25 returned                                                                                  | Exactly 20 sources sent; partial-coverage warning in result and Markdown                    |
| Long messages                     | Commit exceeds 800 characters                                                                          | Bounded before inference; shortening disclosed                                              |
| GitHub limits/failures            | 403 primary/secondary limits, 429, 422, 500, malformed/oversized response, network rejection           | Predictable safe error; retry delay where known; no model call                              |
| Stalled upstreams                 | Unresolved GitHub fetch / AI binding with fake timers                                                  | Deadline errors; no automatic retry                                                         |
| Quota/capacity/model restrictions | Mock provider codes 3036, 3040, 5035, 5028, 3007                                                       | Safe quota/capacity/model/timeout failure; exactly one model attempt; no paid fallback      |
| Invalid structured output         | Non-JSON, empty/extra fields, wrong schema, incomplete chat completion                                 | `INVALID_AI_RESPONSE`; no fabricated notes                                                  |
| Fabricated sources                | Unknown SHA or invented quote on an allowed SHA                                                        | Rejected by grounding checks                                                                |
| Unsupported claims                | Invented security/performance/numeric/breaking text                                                    | Rejected for missing explicit evidence signals                                              |
| Explicit breaking evidence        | Conventional Commit `feat!:` source                                                                    | Accepted only with matching source excerpt                                                  |
| Prompt injection                  | Commit says to ignore instructions and return a fabricated SHA                                         | Text remains serialized data; a mocked injected response fails SHA checks                   |
| Duplicate/inconsistent output     | Repeated entries/evidence; inconsistent coverage counts                                                | Rejected                                                                                    |
| Abuse/CORS                        | Missing bindings, unverified controls, missing trusted IP, failing/denying limiters, lookalike origins | Fail closed before expensive work; exact configured origin allowed                          |
| Markdown/source references        | Known fixtures plus hostile HTML/Markdown text                                                         | Correct source URLs, omitted empty categories, escaped Markdown, no raw HTML execution      |
| Frontend/export                   | Fixture output, clipboard denial, delayed stale request, actual Blob download                          | Exact Markdown copied/downloaded; useful failure; stale output cannot replace selected demo |
| Responsive/accessibility          | 390×664 mobile emulation, 768×1024 tablet, 1280×720 desktop                                            | No horizontal overflow; labeled controls, keyboard skip link, zero tested axe violations    |

Tests do not require remote account credentials, external API keys, real GitHub availability, or paid services. Tests exercising the production success branch use local mock bindings; `mode: "live"` in those fixtures describes the branch being tested, not proof of actual inference.

## Real GitHub retrieval observation

The following public comparison was verified independently and through the locally imported Worker bundle using mocked inference:

- Repository: `https://github.com/octocat/Hello-World`
- Base: `553c2077f0edc3d5dc5d17262f6aa498e69d6f8e`
- Head: `7fd1a60b01f91b314f59955a4e4d4e80d8edf11d`
- GitHub result: `ahead`, 2 total/returned commits.
- Local mock inference selected the newline commit and produced one entry linking to `762941318ee16e59dabbacb1b4049eec22f0d303`.

This verifies public retrieval, actual handler response assembly, and source-link construction. It does not measure the quality, availability, latency, or behavior of Gemma on Cloudflare.

## Findings corrected during local verification

- Restricted npm requests failed with `EACCES` even using a writable workspace cache. Scoped network execution resolved registry access; no cache deletion, administrator elevation, or ACL change was used.
- Wrangler initially tried to write user-level logs outside the writable workspace. Its wrapper now uses a checkout-local configuration directory and disables telemetry.
- Chromium's required binary was initially absent. The matching browser was installed in the ignored workspace cache.
- An initial axe scan found text contrast violations. Muted text colors were corrected; subsequent desktop/tablet/mobile scans passed.
- A component download test initially mishandled fake timers. It now verifies Blob contents and URL cleanup using real asynchronous file reading; it passed subsequently.
- Cloudflare's installed official model types require the standard named JSON-schema wrapper. The adapter was aligned with that exact schema and compile checked; legacy generic documentation alone was insufficient.

## Grounding and injection limitations

SHA membership proves that the cited commit was retrieved. Exact excerpts prove the cited text appeared in the bounded context. Sensitive-claim and numeric checks catch specific unsupported statements. They do **not** establish general semantic entailment, validate source code behavior, or guarantee a benign commit author. A misleading paraphrase or an adversarial instruction quoted as evidence may evade mechanical checks.

The model has no tools or execution access. Commit content is isolated as JSON data beneath a fixed system prompt. The adversarial tests validate prompt construction and rejection logic with mocked responses; they are not a live model resistance benchmark. No measured hallucination rate, accuracy score, injection resistance, or production scale is claimed. Human review against source commits remains necessary.

## Cost and deployment limitations

The preferred model's documented Workers Free eligibility and pricing were checked against official Cloudflare documentation on the evaluation date. Account-specific eligibility and the native rate-limit binding's availability/effectiveness on the owner's Free account remain unverified. Both live flags are false; missing controls fail closed; no paid provider dependency, billing activation, credential, or paid fallback was introduced.

Per-visitor and constant-key aggregate limiters are approximate and independent by Cloudflare location. They are not strict worldwide budgets. Cloudflare's free inference allocation is account-wide. Timeouts bound waiting but cannot promise cancellation of already-started provider compute. These limits are documented in [architecture](ARCHITECTURE.md) and [deployment](DEPLOYMENT.md).

Gates A–D cover this locally implemented, tested, security-reviewed, deployment-ready MVP. Gate E remains unauthorized and unverified: native account access, public URLs, real edge controls, actual successful generation, and public failure-path behavior must be checked only after separate owner approval.
