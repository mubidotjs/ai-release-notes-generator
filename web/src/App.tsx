import { useEffect, useRef, useState, type FormEvent } from "react";
import { requestSchema, type GenerateResult } from "@release-notes/shared";
import { demoRequest, getDemoResult } from "../../fixtures/demo";
import { generateNotes, workerUrl } from "./api";
import { copyMarkdown, downloadMarkdown } from "./export";
import { Results } from "./Results";

export default function App() {
  const [form, setForm] = useState({ repositoryUrl: "", base: "", head: "" });
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [exportError, setExportError] = useState("");
  const [notice, setNotice] = useState("");
  const [view, setView] = useState<"formatted" | "markdown">("formatted");
  const [live, setLive] = useState<
    "checking" | "ready" | "disabled" | "unavailable"
  >(workerUrl ? "checking" : "disabled");
  const active = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    if (workerUrl) {
      fetch(`${workerUrl.replace(/\/$/, "")}/health`, {
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]),
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("Health check failed.");
          const health: unknown = await response.json();
          if (!controller.signal.aborted)
            setLive(
              typeof health === "object" &&
                health !== null &&
                "liveEnabled" in health &&
                health.liveEnabled === true
                ? "ready"
                : "disabled",
            );
        })
        .catch(() => {
          if (!controller.signal.aborted) setLive("unavailable");
        });
    }
    return () => {
      controller.abort();
      active.current?.abort();
      active.current = null;
    };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setExportError("");
    setNotice("");
    const valid = requestSchema.safeParse(form);
    if (!valid.success) {
      setError(
        valid.error.issues[0]?.message ?? "Check your comparison inputs.",
      );
      return;
    }
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setPending(true);
    setResult(null);
    try {
      const next = await generateNotes(valid.data, controller.signal);
      if (active.current === controller) {
        setResult(next);
        setView("formatted");
      }
    } catch (failure) {
      if (active.current === controller)
        setError(
          failure instanceof Error
            ? failure.message
            : "Generation failed. Try again later.",
        );
    } finally {
      if (active.current === controller) {
        setPending(false);
        active.current = null;
      }
    }
  }

  function demo() {
    active.current?.abort();
    active.current = null;
    setPending(false);
    setError("");
    setExportError("");
    setNotice("");
    setForm(demoRequest);
    setResult(getDemoResult());
    setView("formatted");
  }

  async function copy() {
    if (!result) return;
    setExportError("");
    setNotice("");
    try {
      await copyMarkdown(result.markdown);
      setNotice("Markdown copied to clipboard.");
    } catch (failure) {
      setExportError(
        failure instanceof Error ? failure.message : "Unable to copy Markdown.",
      );
    }
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to generator
      </a>
      <header className="app-header">
        <a
          className="brand"
          href="/"
          aria-label="AI Release Notes Generator home"
        >
          <span className="brand-mark" aria-hidden="true">
            ≡
          </span>
          <span>
            Release Notes<span className="brand-ai">AI</span>
          </span>
        </a>
        <span className="header-caption">
          Commit history. Clearly communicated.
        </span>
        <a
          className="source-link"
          href="https://github.com/mubidotjs/ai-release-notes-generator"
          target="_blank"
          rel="noreferrer"
        >
          GitHub <span aria-hidden="true">↗</span>
        </a>
      </header>
      <main id="main">
        <div className="intro">
          <p className="eyebrow">
            <span className="tiny-line" />
            FROM COMMITS TO CHANGELOG
          </p>
          <h1>
            Your next release,
            <br />
            <span>in clear words.</span>
          </h1>
          <p>
            Turn a public GitHub comparison into concise release notes.
            <br className="desktop-break" /> AI-assisted, source-linked, and
            ready to share.
          </p>
        </div>
        <div className="workspace">
          <aside className="input-column" aria-label="Comparison settings">
            <section className="panel input-panel">
              <div className="panel-heading">
                <span className="step">01</span>
                <h2>Compare a repository</h2>
              </div>
              <p className="panel-description">
                Choose the changes you want to describe.
              </p>
              <form
                onSubmit={submit}
                aria-describedby={error ? "form-error" : undefined}
              >
                <label htmlFor="repository">GitHub repository URL</label>
                <input
                  id="repository"
                  type="url"
                  autoComplete="off"
                  placeholder="https://github.com/owner/repository"
                  value={form.repositoryUrl}
                  maxLength={256}
                  required
                  disabled={pending}
                  onChange={(e) =>
                    setForm({ ...form, repositoryUrl: e.target.value })
                  }
                  aria-describedby="repository-help"
                />
                <p className="field-help" id="repository-help">
                  Public repositories only. No token needed.
                </p>
                <div className="reference-fields">
                  <div>
                    <label htmlFor="base">Base reference</label>
                    <input
                      id="base"
                      placeholder="v1.0.0"
                      value={form.base}
                      maxLength={128}
                      required
                      disabled={pending}
                      onChange={(e) =>
                        setForm({ ...form, base: e.target.value })
                      }
                    />
                  </div>
                  <span className="ref-arrow" aria-hidden="true">
                    →
                  </span>
                  <div>
                    <label htmlFor="head">Head reference</label>
                    <input
                      id="head"
                      placeholder="main"
                      value={form.head}
                      maxLength={128}
                      required
                      disabled={pending}
                      onChange={(e) =>
                        setForm({ ...form, head: e.target.value })
                      }
                    />
                  </div>
                </div>
                <p className="field-help">
                  Branch names, tags, or commit SHAs.
                </p>
                <button
                  className="primary-button"
                  type="submit"
                  disabled={pending}
                >
                  {pending
                    ? "Generating release notes…"
                    : "Generate Release Notes"}
                  <span aria-hidden="true">↗</span>
                </button>
                <div className="or-divider">
                  <span />
                  or explore an example
                  <span />
                </div>
                <button className="demo-button" type="button" onClick={demo}>
                  Try Demo
                  <span className="button-caption">No inference required</span>
                </button>
                {error ? (
                  <p className="error" id="form-error" role="alert">
                    {error}
                  </p>
                ) : null}
              </form>
            </section>
            <div className="service-status">
              <span
                className={`status-dot ${live === "ready" ? "ready" : ""}`}
                aria-hidden="true"
              />
              {live === "checking"
                ? "Checking live service…"
                : live === "ready"
                  ? "Live service available"
                  : live === "disabled"
                    ? "Live AI disabled · demo available"
                    : "Live service unavailable · demo available"}
            </div>
            <div className="boundaries">
              <p>
                <span aria-hidden="true">↳</span> Up to 20 commits per
                generation
              </p>
              <p>
                <span aria-hidden="true">↳</span> Every entry includes source
                evidence
              </p>
              <p>
                <span aria-hidden="true">↳</span> Free inference; no paid
                fallbacks
              </p>
            </div>
          </aside>
          <section
            className="panel output-panel"
            aria-label="Release notes output"
            aria-busy={pending}
          >
            <div className="output-heading">
              <div className="panel-heading">
                <span className="step">02</span>
                <h2>Release notes</h2>
              </div>
              {result ? (
                <span className={`mode-badge ${result.mode}`}>
                  {result.mode === "demo" ? "DEMO DATA" : "LIVE AI DRAFT"}
                </span>
              ) : (
                <span className="output-format">MARKDOWN</span>
              )}
            </div>
            <div className="output-toolbar">
              <div className="view-switch" aria-label="Output view">
                <button
                  type="button"
                  aria-pressed={view === "formatted"}
                  onClick={() => setView("formatted")}
                >
                  Preview
                </button>
                <button
                  type="button"
                  aria-pressed={view === "markdown"}
                  onClick={() => setView("markdown")}
                >
                  Markdown
                </button>
              </div>
              <div className="export-actions">
                <button
                  type="button"
                  disabled={!result || pending}
                  onClick={copy}
                >
                  Copy Markdown
                </button>
                <button
                  type="button"
                  disabled={!result || pending}
                  onClick={() => {
                    if (!result) return;
                    try {
                      downloadMarkdown(result);
                      setExportError("");
                      setNotice("Markdown download started.");
                    } catch {
                      setExportError(
                        "Unable to download. Copy the Markdown preview instead.",
                      );
                    }
                  }}
                >
                  Download .md
                </button>
              </div>
            </div>
            <div
              role="status"
              className={notice || pending ? "output-status" : "sr-only"}
            >
              {pending
                ? "Waiting for the service to retrieve commits and generate validated notes…"
                : notice}
            </div>
            {exportError ? (
              <p className="error export-error" role="alert">
                {exportError}
              </p>
            ) : null}
            {result ? (
              view === "formatted" ? (
                <Results result={result} />
              ) : (
                <div className="markdown-container">
                  <label className="sr-only" htmlFor="markdown">
                    Markdown preview
                  </label>
                  <textarea
                    id="markdown"
                    className="markdown-preview"
                    readOnly
                    value={result.markdown}
                    spellCheck={false}
                  />
                </div>
              )
            ) : (
              <div className="empty-state">
                <div className="document-icon" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <h3>
                  {pending
                    ? "Good notes take context."
                    : "A clear story for every release."}
                </h3>
                <p>
                  {pending
                    ? "Retrieving the comparison and checking the generated output. This can take up to a minute."
                    : "Enter a repository and two references, or try the demo to see source-linked notes in action."}
                </p>
                <span className="empty-footnote">
                  Features · Fixes · Improvements · Sources
                </span>
              </div>
            )}
            <div className="output-footer">
              <span className="tiny-square" aria-hidden="true" />
              <span>
                {result
                  ? `${result.comparison.processedCommits} of ${result.comparison.totalCommits} commits processed`
                  : "Source-grounded drafts. Always review before publishing."}
              </span>
            </div>
          </section>
        </div>
      </main>
      <footer className="app-footer">
        <p>
          <a
            href="https://github.com/mubidotjs/ai-release-notes-generator"
            target="_blank"
            rel="noreferrer"
          >
            AI Release Notes Generator
          </a>{" "}
          <span>by Mubashir Hussain</span>
        </p>
        <p>
          React + TypeScript <span aria-hidden="true">/</span> Cloudflare
          Workers AI
        </p>
      </footer>
    </div>
  );
}
