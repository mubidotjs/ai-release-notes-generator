import type { createResult } from "@release-notes/shared";

// Recorded public commits and validated entries from the owner's production export.
// Test data only: replaying this case does not retrieve GitHub or invoke inference.
export const productionExportInput = {
  mode: "live",
  comparison: {
    repositoryUrl: "https://github.com/mubidotjs/ai-release-notes-generator",
    base: "42ddd8b46011abb9decf00c3a027ee92d3bf4604",
    head: "6d7e69a8ec189dabfc30b179e26e9863c5ee1de1",
    totalCommits: 4,
    processedCommits: 4,
    truncated: false,
    messagesTruncated: false,
    status: "ahead",
  },
  sources: [
    {
      sha: "d533970dfe710836cb2c17fd4382e2159a8a3bc5",
      message: "fix: verify Node 24 before Vercel dependency installation",
    },
    {
      sha: "0263e6d1fc0f936e43068877b74ccfcaa0728922",
      message: "chore: configure verified release notes subdomain",
    },
    {
      sha: "8510729fbc232e773bbc0628b2d4112669c55cf7",
      message:
        "fix: support Workers redirects and activate verified production AI",
    },
    {
      sha: "6d7e69a8ec189dabfc30b179e26e9863c5ee1de1",
      message:
        "docs: record branded live launch and verified acceptance results",
    },
  ],
  entries: [
    {
      category: "fixes",
      text: "Verify Node 24 version prior to installing Vercel dependencies",
      evidence: [
        {
          sha: "d533970dfe710836cb2c17fd4382e2159a8a3bc5",
          quote: "fix: verify Node 24 before Vercel dependency installation",
        },
      ],
    },
    {
      category: "fixes",
      text: "Add support for Workers redirects and production AI activation",
      evidence: [
        {
          sha: "8510729fbc232e773bbc0628b2d4112669c55cf7",
          quote:
            "fix: support Workers redirects and activate verified production AI",
        },
      ],
    },
    {
      category: "other",
      text: "Configure the subdomain for verified release notes",
      evidence: [
        {
          sha: "0263e6d1fc0f936e43068877b74ccfcaa0728922",
          quote: "chore: configure verified release notes subdomain",
        },
      ],
    },
  ],
} satisfies Parameters<typeof createResult>[0];
