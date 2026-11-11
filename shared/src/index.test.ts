import { describe, expect, it } from "vitest";
import {
  commitUrl,
  createResult,
  escapeMarkdown,
  parseRepository,
  refSchema,
  requestSchema,
  sanitizeMessage,
  validateGrounding,
} from "./index";
import {
  demoEntries,
  demoRequest,
  demoSources,
  getDemoResult,
} from "../../fixtures/demo";
import { productionExportInput } from "../../fixtures/production-export";

describe("production export summary regression", () => {
  const expectedSummary =
    "Verify Node 24 version prior to installing Vercel dependencies. Add support for Workers redirects and production AI activation.";
  const markdownSummary = (markdown: string) =>
    markdown.split("## Summary\n\n")[1]!.split("\n\n")[0];

  it("separates the two production descriptions into sentences without rewriting entries", () => {
    const result = createResult(productionExportInput);
    expect(result.summary).toBe(expectedSummary);
    expect(result.entries).toEqual(productionExportInput.entries);
    expect(markdownSummary(result.markdown)).toBe(
      escapeMarkdown(result.summary),
    );
  });

  it.each([".", "!", "?", "…", '."', "!’", "?)"])(
    "preserves existing terminal punctuation %s without duplication",
    (ending) => {
      const entries = productionExportInput.entries
        .slice(0, 2)
        .map((entry) => ({
          ...entry,
          text: `  ${entry.text}${ending}  `,
        }));
      const result = createResult({ ...productionExportInput, entries });
      expect(result.summary).toBe(
        `${productionExportInput.entries[0]!.text}${ending} ${productionExportInput.entries[1]!.text}${ending}`,
      );
      expect(markdownSummary(result.markdown)).toBe(
        escapeMarkdown(result.summary),
      );
    },
  );

  it("trims a single description and adds its missing full stop", () => {
    const entry = productionExportInput.entries[0]!;
    const result = createResult({
      ...productionExportInput,
      entries: [{ ...entry, text: `  ${entry.text}  ` }],
    });
    expect(result.summary).toBe(`${entry.text}.`);
    expect(result.entries[0]!.text).toBe(entry.text);
    expect(markdownSummary(result.markdown)).toBe(
      escapeMarkdown(result.summary),
    );
  });

  it("keeps only the first two descriptions when three or more entries exist", () => {
    const result = createResult(productionExportInput);
    expect(result.entries).toHaveLength(3);
    expect(result.summary).toBe(expectedSummary);
    expect(result.summary).not.toContain(
      productionExportInput.entries[2]!.text,
    );
    expect(result.markdown).toContain(productionExportInput.entries[2]!.text);
  });

  it("fits the response limit even with two maximum-length descriptions", () => {
    const sources = ["a", "b"].map((character, i) => ({
      sha: productionExportInput.sources[i]!.sha,
      message: character.repeat(240),
    }));
    const result = createResult({
      ...productionExportInput,
      sources,
      comparison: {
        ...productionExportInput.comparison,
        totalCommits: 2,
        processedCommits: 2,
      },
      entries: sources.map((source) => ({
        category: "other",
        text: source.message,
        evidence: [{ sha: source.sha, quote: source.message }],
      })),
    });
    expect(result.summary).toBe(
      `${sources[0]!.message}. ${sources[1]!.message}.`,
    );
    expect(result.summary).toHaveLength(483);
    expect(markdownSummary(result.markdown)).toBe(
      escapeMarkdown(result.summary),
    );
  });

  it("lists all four processed sources while allowing documentation-only content to be omitted", () => {
    const result = createResult(productionExportInput);
    const sourceSection = result.markdown.split("## Source commits\n\n")[1];
    expect(sourceSection).toBe(
      productionExportInput.sources
        .map(
          (source) =>
            `- [${source.sha.slice(0, 7)}](https://github.com/mubidotjs/ai-release-notes-generator/commit/${source.sha}): ${source.message}`,
        )
        .join("\n") + "\n",
    );
    expect(result.sources).toEqual(productionExportInput.sources);
    expect(result.comparison).toMatchObject({
      processedCommits: 4,
      totalCommits: 4,
      truncated: false,
    });
    expect(result.entries).toHaveLength(3);
    expect(
      result.entries.flatMap((entry) =>
        entry.evidence.map((evidence) => evidence.sha),
      ),
    ).not.toContain(productionExportInput.sources[3]!.sha);
    for (const entry of result.entries) {
      for (const evidence of entry.evidence) {
        const source = result.sources.find(
          (source) => source.sha === evidence.sha,
        )!;
        expect(source.message).toContain(evidence.quote);
        expect(result.markdown).toContain(
          `[${source.sha.slice(0, 7)}](${commitUrl(result.comparison.repositoryUrl, source.sha)})`,
        );
      }
    }
    expect(result.markdown).not.toContain("## Documentation");
    expect(result.markdown).not.toContain("Partial coverage");
  });

  it("preserves safe Markdown escaping and the entry's original wording", () => {
    const text = "Use <tag> & [labels]";
    const source = { ...productionExportInput.sources[0]!, message: text };
    const result = createResult({
      ...productionExportInput,
      entries: [
        {
          category: "other",
          text,
          evidence: [{ sha: source.sha, quote: text }],
        },
      ],
      sources: [source],
      comparison: {
        ...productionExportInput.comparison,
        totalCommits: 1,
        processedCommits: 1,
      },
    });
    expect(result.entries[0]!.text).toBe(text);
    expect(result.summary).toBe(`${text}.`);
    expect(markdownSummary(result.markdown)).toBe(
      "Use &lt;tag&gt; &amp; \\[labels\\]\\.",
    );
    expect(result.markdown).not.toContain("<tag>");
    expect(result.markdown).toContain("- Use &lt;tag&gt; &amp; \\[labels\\] (");
  });
});

describe("repository and reference validation", () => {
  it.each([
    "https://github.com/acme/tool",
    "https://github.com/acme/tool.git",
    "https://github.com/acme/tool/",
  ])("accepts %s", (url) => {
    expect(parseRepository(url)?.url).toBe("https://github.com/acme/tool");
  });
  it.each([
    "http://github.com/acme/tool",
    "https://github.com.evil.test/acme/tool",
    "https://user@github.com/acme/tool",
    "https://github.com:443/acme/tool",
    "https://github.com/acme/tool/issues",
    "https://github.com/acme/tool?x=1",
    "https://github.com/acme/tool#main",
    "https://127.0.0.1/acme/tool",
    "file:///etc/passwd",
    "https://github.com/acme/%2e%2e",
    "https://github.com/acme/..",
    "https://github.com/a--b/tool",
  ])("rejects %s", (url) => {
    expect(parseRepository(url)).toBeNull();
  });
  it.each([
    "main",
    "v1.2.3",
    "feature/export",
    "release/2026-11",
    "a".repeat(40),
  ])("accepts ref %s", (ref) => {
    expect(refSchema.safeParse(ref).success).toBe(true);
  });
  it.each([
    "",
    "-main",
    "HEAD~1",
    "HEAD^",
    "base...head",
    "a..b",
    "main?x",
    "main#x",
    "user:main",
    "refs//main",
    ".hidden",
    "foo/.hidden",
    "foo.lock/main",
    "foo.",
    "main/",
    "a\\b",
    "main\nattack",
    "x".repeat(129),
  ])("rejects ref %s", (ref) => {
    expect(refSchema.safeParse(ref).success).toBe(false);
  });
  it("rejects unknown request fields and oversized URLs", () => {
    expect(
      requestSchema.safeParse({ ...demoRequest, token: "forbidden" }).success,
    ).toBe(false);
    expect(
      requestSchema.safeParse({
        ...demoRequest,
        repositoryUrl: "x".repeat(257),
      }).success,
    ).toBe(false);
  });
});

describe("grounding and Markdown", () => {
  it("builds fixture notes, omits empty categories, and never links synthetic SHAs", () => {
    const result = getDemoResult();
    expect(result.markdown).toContain("DEMO DATA");
    expect(result.markdown).toContain("## Features");
    expect(result.markdown).not.toContain("## Breaking changes");
    expect(result.markdown).not.toContain("/commit/");
    expect(result.markdown).toContain("DEMO-1");
    expect(result.markdown).toContain("## Summary");
  });
  it("constructs exact live source links and includes compared references", () => {
    const result = createResult({ ...getDemoResult(), mode: "live" });
    expect(result.markdown).toContain(
      `https://github.com/demo/release-toolkit/commit/${demoSources[0]!.sha}`,
    );
    expect(result.markdown).toContain("v1\\.2\\.0 → v1\\.3\\.0");
    expect(() =>
      commitUrl("https://evil.test/repo", demoSources[0]!.sha),
    ).toThrow();
    expect(() => commitUrl(demoRequest.repositoryUrl, "fake")).toThrow();
  });
  it("rejects fabricated SHAs and fabricated quotes attached to a valid SHA", () => {
    const base = demoEntries[0]!;
    expect(() =>
      validateGrounding(
        [
          {
            ...base,
            evidence: [{ sha: "f".repeat(40), quote: base.evidence[0]!.quote }],
          },
        ],
        demoSources,
      ),
    ).toThrow();
    expect(() =>
      validateGrounding(
        [
          {
            ...base,
            evidence: [
              {
                sha: demoSources[0]!.sha,
                quote: "add imaginary authentication",
              },
            ],
          },
        ],
        demoSources,
      ),
    ).toThrow();
  });
  it.each([
    "Fix a security vulnerability.",
    "Improve performance and latency.",
    "Make exports 50% faster.",
    "Introduce breaking compatibility changes.",
  ])("rejects unsupported claim: %s", (text) => {
    expect(() =>
      validateGrounding([{ ...demoEntries[0]!, text }], demoSources),
    ).toThrow();
  });
  it("requires a breaking marker in the exact cited excerpt", () => {
    expect(() =>
      validateGrounding(
        [{ ...demoEntries[0]!, category: "breaking" }],
        demoSources,
      ),
    ).toThrow();
    const source = {
      sha: "a".repeat(40),
      message: "feat!: remove legacy export format",
    };
    expect(() =>
      validateGrounding(
        [
          {
            category: "breaking",
            text: "Remove the legacy export format.",
            evidence: [{ sha: source.sha, quote: source.message }],
          },
        ],
        [source],
      ),
    ).not.toThrow();
  });
  it("rejects duplicate entries and inconsistent coverage metadata", () => {
    expect(() =>
      validateGrounding([demoEntries[0]!, demoEntries[0]!], demoSources),
    ).toThrow();
    const result = getDemoResult();
    expect(() =>
      createResult({
        ...result,
        comparison: { ...result.comparison, totalCommits: 30 },
      }),
    ).toThrow();
  });
  it("adds partial and divergent warnings to both output and export", () => {
    const result = getDemoResult();
    const partial = createResult({
      ...result,
      comparison: {
        ...result.comparison,
        totalCommits: 30,
        truncated: true,
        status: "diverged",
        messagesTruncated: true,
      },
    });
    expect(partial.warnings.join(" ")).toContain("4 of 30");
    expect(partial.markdown).toContain("do not cover the complete comparison");
    expect(partial.markdown).toContain("diverged");
    expect(partial.markdown).toContain("shortened");
  });
  it("escapes hostile Markdown/HTML and removes invisible controls from evidence input", () => {
    expect(
      escapeMarkdown("<script>alert(1)</script> [click](javascript:alert(1))"),
    ).not.toContain("<script>");
    expect(escapeMarkdown("[click](javascript:alert(1))")).toContain(
      "\\[click\\]",
    );
    expect(sanitizeMessage("fix: test\u0000\u202e\u2066\nbody")).toBe(
      "fix: test\nbody",
    );
  });
});
