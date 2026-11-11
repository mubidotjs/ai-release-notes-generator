import {
  createResult,
  type SourceCommit,
  type ReleaseEntry,
} from "@release-notes/shared";

export const demoRequest = {
  repositoryUrl: "https://github.com/demo/release-toolkit",
  base: "v1.2.0",
  head: "v1.3.0",
};
// Synthetic identifiers deliberately never become GitHub commit links.
export const demoSources: SourceCommit[] = [
  {
    sha: "1".repeat(40),
    message: "feat: add Markdown export for release notes",
  },
  {
    sha: "2".repeat(40),
    message: "fix: preserve line breaks when copying notes",
  },
  { sha: "3".repeat(40), message: "refactor: share repository URL validation" },
  { sha: "4".repeat(40), message: "docs: clarify local setup instructions" },
];
export const demoEntries: ReleaseEntry[] = [
  {
    category: "features",
    text: "Export release notes as a Markdown file.",
    evidence: [
      {
        sha: demoSources[0]!.sha,
        quote: "add Markdown export for release notes",
      },
    ],
  },
  {
    category: "fixes",
    text: "Preserve line breaks when copying notes.",
    evidence: [
      {
        sha: demoSources[1]!.sha,
        quote: "preserve line breaks when copying notes",
      },
    ],
  },
  {
    category: "improvements",
    text: "Share repository URL validation across the application.",
    evidence: [
      { sha: demoSources[2]!.sha, quote: "share repository URL validation" },
    ],
  },
  {
    category: "other",
    text: "Clarify local setup instructions.",
    evidence: [
      { sha: demoSources[3]!.sha, quote: "clarify local setup instructions" },
    ],
  },
];
export function getDemoResult() {
  return createResult({
    mode: "demo",
    comparison: {
      ...demoRequest,
      totalCommits: 4,
      processedCommits: 4,
      truncated: false,
      messagesTruncated: false,
      status: "ahead",
    },
    entries: demoEntries,
    sources: demoSources,
  });
}
