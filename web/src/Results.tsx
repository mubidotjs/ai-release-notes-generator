import {
  categories,
  CATEGORY_LABELS,
  commitUrl,
  type GenerateResult,
} from "@release-notes/shared";

export function Results({ result }: { result: GenerateResult }) {
  return (
    <article className="release-document" aria-label="Generated release notes">
      <p className="eyebrow">
        {result.mode === "demo" ? "Synthetic example" : "Source-linked draft"}
      </p>
      <h3>{result.title}</h3>
      <p className="comparison">
        <span>{result.comparison.base}</span>
        <span aria-hidden="true"> → </span>
        <span>{result.comparison.head}</span>
      </p>
      <p className="repo-line">{result.comparison.repositoryUrl}</p>
      <div className="notices">
        {result.warnings.map((warning) => (
          <p key={warning}>{warning}</p>
        ))}
      </div>
      <section aria-label="Summary">
        <h4>Summary</h4>
        <p>{result.summary}</p>
      </section>
      {categories.map((category) => {
        const entries = result.entries.filter(
          (entry) => entry.category === category,
        );
        if (!entries.length) return null;
        return (
          <section key={category} aria-label={CATEGORY_LABELS[category]}>
            <h4>
              <span className={`category-dot ${category}`} aria-hidden="true" />
              {CATEGORY_LABELS[category]}
            </h4>
            <ul className="entries">
              {entries.map((entry) => (
                <li key={entry.text}>
                  <p>{entry.text}</p>
                  <div className="entry-evidence">
                    {entry.evidence.map((evidence) => (
                      <span key={evidence.sha}>
                        {result.mode === "demo" ? (
                          <code>
                            DEMO-
                            {result.sources.findIndex(
                              (s) => s.sha === evidence.sha,
                            ) + 1}
                          </code>
                        ) : (
                          <a
                            href={commitUrl(
                              result.comparison.repositoryUrl,
                              evidence.sha,
                            )}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {evidence.sha.slice(0, 7)}
                          </a>
                        )}
                        <q>{evidence.quote}</q>
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <section aria-label="Source commits">
        <h4>
          Source commits{" "}
          <span className="muted">({result.sources.length})</span>
        </h4>
        <ul className="source-list">
          {result.sources.map((source, i) => (
            <li key={source.sha}>
              {result.mode === "demo" ? (
                <code>DEMO-{i + 1}</code>
              ) : (
                <a
                  href={commitUrl(result.comparison.repositoryUrl, source.sha)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {source.sha.slice(0, 7)}
                </a>
              )}
              <span>{source.message.split("\n")[0]}</span>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
