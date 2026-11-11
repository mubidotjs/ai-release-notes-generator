import { z } from "zod";

export const LIMITS = Object.freeze({
  commits: 20,
  requestBytes: 8192,
  githubBytes: 2 * 1024 * 1024,
  messageChars: 800,
  promptChars: 24000,
  completionTokens: 4096,
  modelOutputChars: 48000,
  githubTimeoutMs: 10000,
  aiTimeoutMs: 45000,
});
export const MODEL = "@cf/google/gemma-4-26b-a4b-it";
export const CATEGORY_LABELS = {
  features: "Features",
  fixes: "Bug fixes",
  improvements: "Improvements / refactoring",
  breaking: "Breaking changes",
  other: "Other meaningful changes",
} as const;
export const categories = [
  "features",
  "fixes",
  "improvements",
  "breaking",
  "other",
] as const;

export function parseRepository(value: string) {
  const match =
    /^https:\/\/github\.com\/([a-z\d](?:[a-z\d-]{0,37}[a-z\d])?)\/([a-z\d_.-]{1,100})\/?$/i.exec(
      value,
    );
  if (!match || !match[1] || !match[2] || match[1].includes("--")) return null;
  const owner = match[1];
  const repo = match[2].replace(/\.git$/i, "");
  if (!repo || repo === "." || repo === "..") return null;
  return { owner, repo, url: `https://github.com/${owner}/${repo}` };
}

export const refSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .refine(
    (ref) =>
      /^[a-z\d_][a-z\d._/-]*$/i.test(ref) &&
      !ref.includes("..") &&
      !ref.includes("//") &&
      ref
        .split("/")
        .every(
          (part) =>
            !!part &&
            !part.startsWith(".") &&
            !part.endsWith(".") &&
            !part.endsWith(".lock"),
        ),
    "Use a branch, tag, or SHA without revision expressions or invalid Git ref characters.",
  );
export const requestSchema = z.strictObject({
  repositoryUrl: z
    .string()
    .trim()
    .max(256)
    .refine(
      (v) => !!parseRepository(v),
      "Enter an HTTPS GitHub repository URL without extra paths.",
    ),
  base: refSchema,
  head: refSchema,
});
export type GenerateRequest = z.infer<typeof requestSchema>;

export const shaSchema = z.string().regex(/^[a-f\d]{40}$/);
export const entrySchema = z.strictObject({
  category: z.enum(categories),
  text: z.string().trim().min(4).max(240),
  evidence: z
    .array(
      z.strictObject({ sha: shaSchema, quote: z.string().min(4).max(300) }),
    )
    .min(1)
    .max(3),
});
export const modelSchema = z.strictObject({
  entries: z.array(entrySchema).min(1).max(LIMITS.commits),
});
export type ReleaseEntry = z.infer<typeof entrySchema>;
export const sourceSchema = z.strictObject({
  sha: shaSchema,
  message: z.string().min(1).max(LIMITS.messageChars),
});
export type SourceCommit = z.infer<typeof sourceSchema>;
export const comparisonSchema = z.strictObject({
  repositoryUrl: z.string().refine((v) => !!parseRepository(v)),
  base: refSchema,
  head: refSchema,
  totalCommits: z.number().int().nonnegative(),
  processedCommits: z.number().int().min(1).max(LIMITS.commits),
  truncated: z.boolean(),
  messagesTruncated: z.boolean(),
  status: z.enum(["ahead", "diverged"]),
});
export type Comparison = z.infer<typeof comparisonSchema>;
export const resultSchema = z.strictObject({
  mode: z.enum(["live", "demo"]),
  model: z.string(),
  title: z.string().max(320),
  summary: z.string().max(500),
  comparison: comparisonSchema,
  entries: modelSchema.shape.entries,
  sources: z.array(sourceSchema).min(1).max(LIMITS.commits),
  warnings: z.array(z.string().max(500)).max(8),
  markdown: z.string().max(100000),
});
export type GenerateResult = z.infer<typeof resultSchema>;

export const errorCodes = [
  "INVALID_REQUEST",
  "PAYLOAD_TOO_LARGE",
  "ORIGIN_NOT_ALLOWED",
  "NOT_FOUND",
  "METHOD_NOT_ALLOWED",
  "LIVE_AI_DISABLED",
  "ABUSE_CONTROLS_UNAVAILABLE",
  "RATE_LIMITED",
  "REPOSITORY_UNAVAILABLE",
  "COMPARE_UNAVAILABLE",
  "NO_CHANGES",
  "GITHUB_FORBIDDEN",
  "GITHUB_RATE_LIMITED",
  "GITHUB_TIMEOUT",
  "GITHUB_UNAVAILABLE",
  "AI_TIMEOUT",
  "AI_UNAVAILABLE",
  "AI_QUOTA_EXHAUSTED",
  "AI_MODEL_UNAVAILABLE",
  "INVALID_AI_RESPONSE",
  "UNSUPPORTED_AI_OUTPUT",
  "INTERNAL_ERROR",
] as const;
export type ErrorCode = (typeof errorCodes)[number];
export const errorSchema = z.strictObject({
  error: z.strictObject({
    code: z.enum(errorCodes),
    message: z.string(),
    retryAfterSeconds: z.number().int().positive().optional(),
  }),
});

/** Normalize controls before bounding; preserve lines so exact excerpts can be verified. */
export function sanitizeMessage(value: string) {
  return Array.from(value.replace(/\r\n?/g, "\n"))
    .filter((c) => {
      const n = c.codePointAt(0)!;
      return (
        c === "\n" ||
        c === "\t" ||
        (n >= 32 &&
          !(n >= 127 && n <= 159) &&
          !(n >= 0x202a && n <= 0x202e) &&
          !(n >= 0x2066 && n <= 0x2069))
      );
    })
    .join("")
    .trim();
}

const sensitiveClaims = [
  /\b(breaking|incompatib\w*|backwards?[- ]incompatib\w*)\b/i,
  /\b(secur\w*|vulnerab\w*|cve[- ]?\d*|xss|csrf|exploit\w*|injection|ssrf)\b/i,
  /\b(performance|faster|speed\w*|latency|optimi[sz]\w*|memory|throughput|efficient\w*)\b/i,
];
const breakingEvidence =
  /(?:^[a-z]+(?:\([^\n)]*\))?!:|\bBREAKING[ -]CHANGE\b)/im;

/** Mechanical grounding is a guardrail, not proof of semantic entailment. */
export function validateGrounding(
  entries: ReleaseEntry[],
  sources: SourceCommit[],
) {
  const allowed = new Map(sources.map((s) => [s.sha, s.message]));
  const seen = new Set<string>();
  for (const entry of entries) {
    const key = entry.text.toLowerCase();
    if (seen.has(key)) throw new Error("Duplicate release-note entry.");
    seen.add(key);
    const evidenceSeen = new Set<string>();
    for (const evidence of entry.evidence) {
      const message = allowed.get(evidence.sha);
      if (
        !message ||
        !message.includes(evidence.quote) ||
        evidenceSeen.has(evidence.sha)
      ) {
        throw new Error("A source SHA or exact evidence excerpt is invalid.");
      }
      evidenceSeen.add(evidence.sha);
    }
    const quotes = entry.evidence.map((e) => e.quote).join("\n");
    if (
      entry.category === "breaking" &&
      !entry.evidence.some((e) => breakingEvidence.test(e.quote))
    ) {
      throw new Error("Breaking changes require an explicit source marker.");
    }
    for (const claim of sensitiveClaims) {
      if (claim.test(entry.text) && !claim.test(quotes))
        throw new Error("A sensitive claim lacks explicit evidence.");
    }
    for (const numericClaim of entry.text.match(/\d+(?:\.\d+)?%?/g) ?? []) {
      if (!quotes.includes(numericClaim))
        throw new Error("A numeric claim lacks explicit evidence.");
    }
  }
}

export function commitUrl(repositoryUrl: string, sha: string) {
  const repo = parseRepository(repositoryUrl);
  if (!repo || !shaSchema.safeParse(sha).success)
    throw new Error("Invalid source link.");
  return `${repo.url}/commit/${sha}`;
}
export function escapeMarkdown(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/([\\`*_{}[\]()#+.!|~-])/g, "\\$1")
    .replace(/\r?\n/g, " ");
}

export function createResult(input: {
  mode: "live" | "demo";
  comparison: Comparison;
  entries: ReleaseEntry[];
  sources: SourceCommit[];
}): GenerateResult {
  const entries = modelSchema.parse({ entries: input.entries }).entries;
  const sources = z
    .array(sourceSchema)
    .min(1)
    .max(LIMITS.commits)
    .parse(input.sources);
  const comparison = comparisonSchema.parse(input.comparison);
  if (
    new Set(sources.map((s) => s.sha)).size !== sources.length ||
    comparison.processedCommits !== sources.length ||
    comparison.totalCommits < sources.length ||
    comparison.truncated !== comparison.totalCommits > sources.length
  ) {
    throw new Error("Inconsistent comparison coverage.");
  }
  validateGrounding(entries, sources);
  const repo = parseRepository(comparison.repositoryUrl)!;
  const title = `Release notes: ${repo.owner}/${repo.repo}`;
  const summary = entries
    .slice(0, 2)
    .map((entry) => {
      const text = entry.text.trim();
      return /[.!?…]["'’”)\]]*$/.test(text) ? text : `${text}.`;
    })
    .join(" ");
  const warnings = [
    ...(input.mode === "demo"
      ? [
          "Demo data — synthetic commits and deterministic output. No live repository retrieval or AI inference.",
        ]
      : []),
    ...(comparison.truncated
      ? [
          `Partial coverage: ${sources.length} of ${comparison.totalCommits} commits processed (first chronological subset). These notes do not cover the complete comparison.`,
        ]
      : []),
    ...(comparison.messagesTruncated
      ? [
          "Long commit messages were shortened before inference; only the supplied excerpts were considered.",
        ]
      : []),
    ...(comparison.status === "diverged"
      ? [
          "The references have diverged. Notes describe commits unique to the head side of the comparison.",
        ]
      : []),
    "Based on commit messages, not code review. Source references and excerpts are checked; review AI wording for semantic accuracy.",
  ];
  const model = input.mode === "demo" ? "Deterministic fixture (no AI)" : MODEL;
  const lines = [
    `# ${escapeMarkdown(title)}`,
    "",
    ...(input.mode === "demo"
      ? ["> DEMO DATA — synthetic commits; no live AI inference.", ""]
      : []),
    `Repository: ${escapeMarkdown(repo.url)}`,
    `Comparison: ${escapeMarkdown(comparison.base)} → ${escapeMarkdown(comparison.head)}`,
    "",
    ...warnings.map((w) => `> ${escapeMarkdown(w)}`),
    "",
    "## Summary",
    "",
    escapeMarkdown(summary),
    "",
  ];
  for (const category of categories) {
    const selected = entries.filter((e) => e.category === category);
    if (!selected.length) continue;
    lines.push(`## ${CATEGORY_LABELS[category]}`, "");
    for (const entry of selected) {
      const references = entry.evidence
        .map((e) =>
          input.mode === "demo"
            ? `DEMO-${sources.findIndex((s) => s.sha === e.sha) + 1}`
            : `[${e.sha.slice(0, 7)}](${commitUrl(repo.url, e.sha)})`,
        )
        .join(", ");
      lines.push(`- ${escapeMarkdown(entry.text)} (${references})`);
    }
    lines.push("");
  }
  lines.push("## Source commits", "");
  sources.forEach((source, i) => {
    const reference =
      input.mode === "demo"
        ? `DEMO-${i + 1}`
        : `[${source.sha.slice(0, 7)}](${commitUrl(repo.url, source.sha)})`;
    lines.push(
      `- ${reference}: ${escapeMarkdown(source.message.split("\n")[0]!)}`,
    );
  });
  return resultSchema.parse({
    mode: input.mode,
    model,
    title,
    summary,
    comparison,
    entries,
    sources,
    warnings,
    markdown: lines.join("\n") + "\n",
  });
}
