# Repository instructions

This repository contains only the AI Release Notes Generator MVP: React/Vite frontend, Cloudflare Worker, shared validation/Markdown code, synthetic fixtures, tests, CI, and the essential documentation.

- Use Node.js 24 and npm workspaces. Keep dependency versions reproducible through the lockfile.
- Use only GitHub Free, Vercel Hobby static hosting, Cloudflare Workers Free, Workers AI's free allocation, public unauthenticated GitHub REST requests, and open-source dependencies.
- Never add paid models, commercial API keys, billing, paid fallbacks, databases, authentication, agents, or unrelated features.
- Never access or change unrelated production projects, including mubashirhussain.dev.
- Obtain explicit owner authorization before any remote mutation: repository creation, push, deployment, DNS changes, live inference enablement, or cloud configuration changes. Gates A–D authorize local work only. Gate E is separate.
- Keep live inference disabled in committed configuration. Fail closed when abuse-control verification or required bindings are absent.
- Treat commits and model output as untrusted. Preserve fixed GitHub fetch destinations, bounded input/output, strict schemas, source SHA/excerpt validation, safe text rendering, and accurate coverage labels.
- Run type checking, lint, unit tests, browser smoke tests, and production builds after material changes. Tests and CI must require no credentials or real inference.
- Record actual results and distinguish mocked local checks from real deployed integration checks. Never claim Gate E, measured model accuracy, or deployed status without evidence.
- Do not weaken permissions or delete caches to solve tooling failures. A workspace npm cache and narrowly scoped network execution are acceptable.
