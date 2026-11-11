import { z } from "zod";
import {
  LIMITS,
  parseRepository,
  sanitizeMessage,
  shaSchema,
  type GenerateRequest,
  type Comparison,
  type SourceCommit,
} from "@release-notes/shared";
import { AppError, readBounded, withDeadline } from "./errors";

const compareSchema = z.object({
  total_commits: z.number().int().nonnegative(),
  status: z.enum(["ahead", "behind", "identical", "diverged"]),
  commits: z
    .array(
      z.object({
        sha: shaSchema,
        commit: z.object({ message: z.string().max(100000) }),
      }),
    )
    // Bound anomalous/unpaginated responses too; inference still receives at most 20.
    .max(250),
});

function retryDelay(response: Response) {
  const value = response.headers.get("retry-after");
  const reset = response.headers.get("x-ratelimit-reset");
  const seconds = value
    ? /^\d+$/.test(value)
      ? Number(value)
      : (Date.parse(value) - Date.now()) / 1000
    : reset
      ? Number(reset) - Date.now() / 1000
      : 60;
  return Number.isFinite(seconds)
    ? Math.min(86400, Math.max(1, Math.ceil(seconds)))
    : 60;
}

export async function fetchComparison(
  input: GenerateRequest,
  fetcher: typeof fetch = fetch,
): Promise<{ comparison: Comparison; sources: SourceCommit[] }> {
  const repo = parseRepository(input.repositoryUrl)!;
  const url = `https://api.github.com/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}/compare/${encodeURIComponent(input.base)}...${encodeURIComponent(input.head)}?per_page=20&page=1`;
  const controller = new AbortController();
  try {
    return await withDeadline(
      async () => {
        const response = await fetcher(url, {
          redirect: "error",
          signal: controller.signal,
          headers: {
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2026-03-10",
            "User-Agent": "ai-release-notes-generator",
          },
        });
        if (response.status === 404)
          throw new AppError(
            "REPOSITORY_UNAVAILABLE",
            "The public repository or comparison was not found. Private repositories are unsupported.",
            404,
          );
        if (response.status === 429)
          throw new AppError(
            "GITHUB_RATE_LIMITED",
            "GitHub request limit reached. Try again after the indicated delay.",
            429,
            retryDelay(response),
          );
        if (response.status === 403) {
          const errorText = await readBounded(
            response.body,
            LIMITS.githubBytes,
            new AppError(
              "GITHUB_UNAVAILABLE",
              "GitHub returned an oversized response.",
              502,
            ),
          );
          if (
            response.headers.get("x-ratelimit-remaining") === "0" ||
            response.headers.has("retry-after") ||
            /rate limit/i.test(errorText)
          ) {
            throw new AppError(
              "GITHUB_RATE_LIMITED",
              "GitHub request limit reached. Try again later.",
              429,
              retryDelay(response),
            );
          }
          throw new AppError(
            "GITHUB_FORBIDDEN",
            "GitHub denied access to this public comparison.",
            403,
          );
        }
        if ([409, 422].includes(response.status))
          throw new AppError(
            "COMPARE_UNAVAILABLE",
            "GitHub could not compare these references. Check the branches, tags, or SHAs.",
            422,
          );
        if (!response.ok)
          throw new AppError(
            "GITHUB_UNAVAILABLE",
            "GitHub is temporarily unavailable. Try again later.",
            502,
          );
        const text = await readBounded(
          response.body,
          LIMITS.githubBytes,
          new AppError(
            "GITHUB_UNAVAILABLE",
            "GitHub comparison exceeds the supported response size. Try a smaller range.",
            502,
          ),
        );
        let data: z.infer<typeof compareSchema>;
        try {
          data = compareSchema.parse(JSON.parse(text));
        } catch {
          throw new AppError(
            "GITHUB_UNAVAILABLE",
            "GitHub returned an invalid comparison response.",
            502,
          );
        }
        if (
          !data.commits.length ||
          !data.total_commits ||
          data.status === "identical" ||
          data.status === "behind"
        ) {
          throw new AppError(
            "NO_CHANGES",
            "No commits unique to the head reference were found in this comparison.",
            422,
          );
        }
        if (
          data.total_commits < data.commits.length ||
          new Set(data.commits.map((c) => c.sha)).size !== data.commits.length
        ) {
          throw new AppError(
            "GITHUB_UNAVAILABLE",
            "GitHub returned inconsistent comparison metadata.",
            502,
          );
        }
        const selected = data.commits.slice(0, LIMITS.commits);
        const messages = selected.map((c) => sanitizeMessage(c.commit.message));
        if (messages.some((m) => !m))
          throw new AppError(
            "GITHUB_UNAVAILABLE",
            "Comparison contains an empty commit message.",
            502,
          );
        const sources = selected.map((c, i) => ({
          sha: c.sha,
          message: messages[i]!.slice(0, LIMITS.messageChars),
        }));
        return {
          sources,
          comparison: {
            repositoryUrl: repo.url,
            base: input.base,
            head: input.head,
            totalCommits: data.total_commits,
            processedCommits: sources.length,
            truncated: data.total_commits > sources.length,
            messagesTruncated: messages.some(
              (m) => m.length > LIMITS.messageChars,
            ),
            status: data.status,
          },
        };
      },
      LIMITS.githubTimeoutMs,
      new AppError(
        "GITHUB_TIMEOUT",
        "GitHub did not respond in time. Try again later.",
        504,
      ),
    );
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      "GITHUB_UNAVAILABLE",
      "Unable to retrieve the public GitHub comparison.",
      502,
    );
  } finally {
    controller.abort();
  }
}
