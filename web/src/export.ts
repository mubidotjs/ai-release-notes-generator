import type { GenerateResult } from "@release-notes/shared";

export async function copyMarkdown(markdown: string) {
  if (!navigator.clipboard?.writeText)
    throw new Error(
      "Clipboard access is unavailable. Select the Markdown preview and copy it manually.",
    );
  try {
    await navigator.clipboard.writeText(markdown);
  } catch {
    throw new Error(
      "Clipboard permission was denied. Select the Markdown preview and copy it manually.",
    );
  }
}

export function downloadMarkdown(result: GenerateResult) {
  const blob = new Blob([result.markdown], {
    type: "text/markdown;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const ref = result.comparison.head
    .replace(/[^a-z\d._-]+/gi, "-")
    .slice(0, 50);
  anchor.href = url;
  anchor.download = `${result.mode === "demo" ? "demo-" : ""}release-notes-${ref}.md`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Allow the browser to start reading the Blob before releasing the URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
