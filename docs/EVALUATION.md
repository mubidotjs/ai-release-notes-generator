# Evaluation and observed results

Evaluation date: **2026-11-11**. Host: Windows 10, Node.js **24.22.1**, npm **11.16.0**. GitHub publication, hosted CI, and the public synthetic/demo deployment are verified. Local/CI generation tests use mocked inference. Following explicit owner authorization and deployed safeguard checks, one real native Gemma generation through the branded frontend and an invalid-reference failure passed. Historical disabled-mode observations below precede activation.

## Verification results

| Check                                                          | Observed result                                        | Boundary                                                                                          |
| -------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `npm install --cache .npm-cache`                               | Passed using scoped network execution                  | Local dependencies; no permissions weakened                                                       |
| `npm run typecheck`                                            | Passed                                                 | Strict TypeScript, including official model input types                                           |
| `npm run lint`                                                 | Passed with zero warnings                              | Authored source/configuration; tool caches excluded                                               |
| `npm test`                                                     | **110 passed**, 3 test files (latest run)              | Actual application pipeline with mock GitHub, AI, and limiter dependencies; JSDOM component tests |
| `npm run build`                                                | Passed                                                 | Vite static build and Wrangler production **dry run**, not deployment                             |
| `npm run test:browser`                                         | **9 passed**, desktop/tablet/mobile Chromium           | Real local browser; fixture demo and mocked HTTP generation success/failure                       |
| axe WCAG A/AA/2.1 AA scan                                      | No violations in tested demo states at all three sizes | Automated accessibility basics, not a complete accessibility audit                                |
| `npm audit --omit=dev`                                         | No reported production dependency vulnerabilities      | npm advisory snapshot; not a security guarantee                                                   |
| Local `workerd` `/health`                                      | HTTP 200; `liveEnabled: false`; exact configured model | Real local Worker runtime, no AI/GitHub calls                                                     |
| Public unauthenticated GitHub compare                          | HTTP 200; `ahead`; 2 total/returned commits            | Real external GitHub API, no inference                                                            |
| Built Worker handler + real public GitHub + mocked AI/limiters | HTTP 200; 2 sources; 1 entry; correct source URL       | Node import of actual Worker bundle, **not** deployed Cloudflare or real inference                |
| Actual Cloudflare model inference                              | One real Gemma generation passed                       | Public branded frontend → GitHub → native Workers AI; source and export checks below              |
| GitHub-hosted Actions                                          | Passed on implementation 8510729; run 43028754575                       | Real hosted CI, no inference or deployment credentials                                            |
| Vercel / Cloudflare hosting                                    | Branded HTTPS and original URL verified                | Workers Free and Vercel Hobby confirmed; production live flags true                               |

The clean lockfile installation `npm ci --offline --cache .npm-cache` also passed, installing 296 packages from the existing cache after local preview processes were stopped. No permission change or remote account operation was needed.

Additional real local Worker requests returned HTTP 503 `LIVE_AI_DISABLED` for generation, echoed the exact configured development origin in CORS headers, and rejected an unrelated origin with HTTP 403. These requests made no inference calls.

The request-protection tests include a disabled-production branch that exercises mocked limiter bindings and confirms zero GitHub/model calls. Neither this test nor a successful dry run verifies native deployed limiter effectiveness or Free-plan eligibility for a specific account.

The source was published with owner authorization to [mubidotjs/ai-release-notes-generator](https://github.com/mubidotjs/ai-release-notes-generator) at initial commit [`dbe2df4e411b1ad8aced58551cde69df5d7a16d8`](https://github.com/mubidotjs/ai-release-notes-generator/commit/dbe2df4e411b1ad8aced58551cde69df5d7a16d8). The owner and empty remote were verified first, the exact uploaded tree contains 42 intended files, and the [hosted Quality checks run](https://github.com/mubidotjs/ai-release-notes-generator/actions/runs/43017214236) passed every step. No billing configuration, DNS, unrelated project, or live inference was changed.

The publication verification repeated type checking, lint, 105 unit/component tests, both builds, and 9 browser tests successfully. Local frontend HTTP 200 was verified on temporary port 5480 after the configured 5400 start was refused; Windows excluded port ranges include 5173. The independently started local Worker returned HTTP 200 for health and HTTP 503 `LIVE_AI_DISABLED` for generation. `.vercel/` was added to the existing ignore rules before publication. The staged source/artifact scan found no credential patterns or forbidden generated/cache paths.

## Initial disabled public deployment evaluation (historical, 2026-11-11)

- Frontend: [https://ai-release-notes-generator.vercel.app](https://ai-release-notes-generator.vercel.app), HTTP 200 without cookies, with the expected application title and configured security headers. Vercel built only `web/dist` using `npm ci` and `npm run build -w web`, from the authorized GitHub repository with Node 24.x. No Vercel backend was deployed.
- Worker: [https://ai-release-notes-generator.mubikhan69.workers.dev](https://ai-release-notes-generator.mubikhan69.workers.dev). Initial CORS-deployment version: `bf450dae-0b40-4989-94a8-991d0ea47bcc`. Public `/health` returned HTTP 200, `@cf/google/gemma-4-26b-a4b-it`, and `liveEnabled: false`.
- Plan evidence came from the signed-in ChatGPT in-app browser: Cloudflare Workers showed **Free, $0, Current plan**; the selected Vercel team showed **Hobby**. Wrangler OAuth alone could not read subscriptions (403), so `default_usage_model: standard` was deliberately not treated as Free-plan proof.
- The deployed settings API confirmed `AI`, visitor namespace `11001` at 2/60s, aggregate namespace `11002` at 10/60s, both live flags `false`, and `ALLOWED_ORIGINS=https://ai-release-notes-generator.vercel.app`. No billing/paid-plan settings, DNS, or unrelated project settings were changed. Vercel's existing protection settings were retained; the canonical production URL is public.
- In the public application, Try Demo displayed **DEMO DATA**, the no-inference notice, four categorized entries, exact supporting excerpts, and synthetic source labels. Markdown preview contained 1,059 characters. Copy was verified by an actual clipboard paste matching the preview after the destination URL input's newline removal. Downloaded `demo-release-notes-v1.3.0.md` matched the preview exactly. These were real public UI checks, not mocked HTTP responses.
- The public Generate action displayed the disabled-live error; Try Demo restored the synthetic result. No generated response was represented as real inference. Keyboard Tab moved from Try Demo to Preview with a visible focus ring. Mobile testing at 390×844 showed no horizontal overflow, correctly associated labels for all three form fields, and the demo label. The temporary viewport override was reset.
- Public API checks at 17:33 PKT (12:33 UTC) returned OPTIONS 204 with the exact allowed origin, health 200 with that origin, and HTTP 403 `ORIGIN_NOT_ALLOWED` without an allow-origin header for an unrelated origin. Visitor attempts returned **503, 503, 503, then 429 `RATE_LIMITED` with `Retry-After: 60` on attempt 4**. This observed overshoot is consistent with approximate edge counters; it is not evidence of an exact two-request cap.
- The aggregate binding's configuration was deployed and read back, and its rejection branch is covered by unit tests. Its threshold was **not** exhausted through multiple real public visitors, and no strict worldwide budget was demonstrated. Missing/failing-protection behavior is covered by local tests; production bindings were not deliberately removed.
- All public generation attempts stopped before GitHub retrieval/model inference because live generation remained disabled or throttled. Native bindings and the disabled workflow were verified; actual model access, output grounding under real inference, model latency, and account-wide usage totals were not measured. No paid API or billing activation was introduced.

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

The preferred model's documented Workers Free eligibility and pricing were checked against official Cloudflare documentation on the evaluation date. The owner's Workers Free and Vercel Hobby plans were confirmed in their signed-in dashboards, and native limiter bindings were accepted/read back with actual visitor throttling observed. One model-specific native inference call succeeded after subsequent owner authorization. Both production live flags are true; local defaults remain false. No paid provider dependency, billing activation, model API key, or paid fallback was introduced. Normal owner-approved Wrangler OAuth credentials remain only in ignored local tool state.

Per-visitor and constant-key aggregate limiters are approximate and independent by Cloudflare location. They are not strict worldwide budgets. Cloudflare's free inference allocation is account-wide. Timeouts bound waiting but cannot promise cancellation of already-started provider compute. These limits are documented in [architecture](ARCHITECTURE.md) and [deployment](DEPLOYMENT.md).

Gates A–D remain complete. The owner separately authorized the production launch. Gate E's small real-generation and invalid-reference acceptance checks passed on 2026-11-11; evidence is below. This establishes a working integration on one example, not measured model accuracy or broad reliability.

## Authorized live production acceptance, 2026-11-11

- Canonical HTTPS: https://release-notes.mubashirhussain.dev; original https://ai-release-notes-generator.vercel.app also returns HTTP 200. Vercel Hobby remains unchanged. DNS added only the assigned release-notes CNAME; nameservers and existing portfolio/email records were preserved.
- Verified implementation SHA: `8510729fbc232e773bbc0628b2d4112669c55cf7`; [CI 43028754575](https://github.com/mubidotjs/ai-release-notes-generator/actions/runs/43028754575) succeeded. Vercel deployment `dpl_6QjLSUAEwGL1XUzcCdZZrJn1mJpt` READY. Install logs for the restored build explicitly showed Node v24.22.2 and npm 11.19.1 before npm ci; engine-strict remains true.
- Worker version `1ba23e75-f224-433e-b341-04e6751cc3d0`, native AI and visitor/aggregate bindings retained, production flags true/true read back from deployed settings. Health reports the exact model and liveEnabled true. Default local configuration remains false/false with no remote AI binding.
- Positive input: repository `https://github.com/mubidotjs/ai-release-notes-generator`, base `42ddd8b46011abb9decf00c3a027ee92d3bf4604`, head `d533970dfe710836cb2c17fd4382e2159a8a3bc5`. Independent public compare returned 1 commit. Actual browser submission returned LIVE AI DRAFT, 1 of 1 commits processed, summary and Bug fixes item: “Verify Node 24 version before installing Vercel dependencies”. Source SHA equals the sole retrieved SHA; quoted evidence exactly matches “fix: verify Node 24 before Vercel dependency installation”. Both source links point to the correct public commit URL. Empty unsupported categories were omitted.
- Runtime tail captured POST HTTP 200 from the branded Origin on that exact Worker version (2026-11-11 13:24:25 UTC). The deployed path calls native env.AI.run with Gemma and validates its output before returning success; no fixture or mock path is used by the live endpoint. This is actual model integration evidence, not a health-only readiness claim. Tail wall time was 4,182 ms for this one request; no latency guarantee or benchmark is claimed.
- Markdown preview contained 824 characters. Downloaded .md bytes matched the preview exactly. Copy succeeded and actual paste into the form matched the preview after the URL field's newline removal. No unsupported/security/breaking/performance claims were produced in this example.
- Negative: the same public frontend submitted head `codex-nonexistent-ref-20261111` and displayed the meaningful unavailable-comparison error with no notes. A direct public check confirmed HTTP 404 REPOSITORY_UNAVAILABLE. GitHub 404 throws before generateEntries; the corresponding mocked test asserts AI was not called. No separate provider per-request billing trace is claimed. Try Demo immediately restored the labeled synthetic result.
- Both exact approved Origins return matching allow-origin headers and enabled health. Unrelated Origin returns 403 ORIGIN_NOT_ALLOWED with no allow-origin header. Enabled-mode invalid-ref requests returned 404 on attempts 1–3 and 429 RATE_LIMITED on attempt 4 with Retry-After 60, without further model calls. These observations confirm approximate visitor throttling, not an exact 2-request global counter. Both native success paths are exercised; aggregate denial and missing/failing controls are verified with mocks, not a distributed public stress test.
- Mobile viewport 390×844: no horizontal overflow, all three form labels point to controls, DEMO DATA remains present; viewport restored afterward. Automated desktop/tablet/mobile axe checks pass in the 9-test browser suite. The existing synthetic workflow and original URL continue to work.
- Workers Free dashboard still showed $0 Current plan and 10,000 neurons/day before activation; current official documentation explicitly lists this Gemma model as Free eligible. No plan, billing method, AI Gateway, paid model, or fallback was enabled. Only one successful inference was required; daily free allocation was not deliberately exhausted.

### Integration correction discovered by the real test

The first live submission returned HTTP 502 before inference because Workers rejects redirect: error during Request construction. Official documentation and a separate local workerd runtime experiment reproduced the exact TypeError; manual mode constructed successfully. Live generation was immediately disabled and health verified false (rollback version 6f58749b-56df-41c6-989e-a0699cabc4c0). The GitHub adapter now uses manual mode and rejects every 3xx response before AI. Five regression cases cover 301/302/303/307/308, no follow-up fetch and no model call. Full checks then passed (110 unit/component, 9 browser, typecheck, lint, both builds) before corrected activation. No SSRF protection was relaxed.

Model hallucination/prompt-injection resistance remains evaluated with synthetic mocked cases; the one benign real example is not an adversarial benchmark. Provider quota/capacity failure handling remains mocked rather than deliberately exhausting or disrupting the free service.
