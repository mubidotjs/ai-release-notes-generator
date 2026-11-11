// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { generateNotes } from "./api";
import { getDemoResult } from "../../fixtures/demo";
import { downloadMarkdown } from "./export";

vi.mock("./api", () => ({ workerUrl: "", generateNotes: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("generator interface", () => {
  it("has accessible inputs and explicitly labels deterministic demo data", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(
      screen.getByRole("textbox", { name: "GitHub repository URL" }),
    ).toBeRequired();
    expect(
      screen.getByRole("textbox", { name: "Base reference" }),
    ).toBeRequired();
    expect(
      screen.getByRole("textbox", { name: "Head reference" }),
    ).toBeRequired();
    expect(
      screen.getByRole("button", { name: "Copy Markdown" }),
    ).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /Try Demo/ }));
    expect(screen.getByText("DEMO DATA")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "AI Release Notes Generator" }),
    ).toHaveAttribute(
      "href",
      "https://github.com/mubidotjs/ai-release-notes-generator",
    );
    expect(
      screen.getByText(/No live repository retrieval or AI inference/),
    ).toBeVisible();
    expect(screen.getByRole("article")).toHaveTextContent("DEMO-1");
    expect(screen.queryByRole("link", { name: "DEMO-1" })).toBeNull();
    expect(generateNotes).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Markdown" }));
    expect(screen.getByLabelText("Markdown preview")).toHaveValue(
      getDemoResult().markdown,
    );
  });
  it("copies the exact Markdown and reports clipboard failure", async () => {
    const user = userEvent.setup();
    render(<App />);
    const clipboard = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue();
    await user.click(screen.getByRole("button", { name: /Try Demo/ }));
    await user.click(screen.getByRole("button", { name: "Copy Markdown" }));
    expect(clipboard).toHaveBeenCalledWith(getDemoResult().markdown);
    expect(screen.getByRole("status")).toHaveTextContent("Markdown copied");
    clipboard.mockRejectedValue(new Error("denied"));
    await user.click(screen.getByRole("button", { name: "Copy Markdown" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Clipboard permission was denied",
    );
  });
  it("validates comparison input before requesting generation", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(
      screen.getByLabelText("GitHub repository URL"),
      "https://evil.test/owner/repo",
    );
    await user.type(screen.getByLabelText("Base reference"), "v1");
    await user.type(screen.getByLabelText("Head reference"), "main");
    await user.click(
      screen.getByRole("button", { name: "Generate Release Notes" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("HTTPS GitHub");
    expect(generateNotes).not.toHaveBeenCalled();
  });
  it("shows service errors without displaying successful output", async () => {
    const user = userEvent.setup();
    vi.mocked(generateNotes).mockRejectedValue(
      new Error("Free inference unavailable."),
    );
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Try Demo/ }));
    await user.click(
      screen.getByRole("button", { name: "Generate Release Notes" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Free inference unavailable",
    );
    expect(screen.queryByRole("article")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Copy Markdown" }),
    ).toBeDisabled();
  });
  it("does not let a stale request overwrite a newly chosen demo", async () => {
    const user = userEvent.setup();
    let finish:
      ((result: ReturnType<typeof getDemoResult>) => void) | undefined;
    vi.mocked(generateNotes).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Try Demo/ }));
    await user.click(
      screen.getByRole("button", { name: "Generate Release Notes" }),
    );
    expect(
      screen.getByRole("button", { name: /Generating release notes/ }),
    ).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /Try Demo/ }));
    finish!({ ...getDemoResult(), title: "Stale output" });
    await waitFor(() =>
      expect(screen.getByRole("article")).not.toHaveTextContent("Stale output"),
    );
    expect(screen.getByText("DEMO DATA")).toBeVisible();
  });
  it("downloads the exact Markdown in a labeled .md file and releases the Blob URL", async () => {
    try {
      let blob: Blob | undefined;
      Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        value: vi.fn((value: Blob) => {
          blob = value;
          return "blob:test";
        }),
      });
      const revoke = vi.fn();
      Object.defineProperty(URL, "revokeObjectURL", {
        configurable: true,
        value: revoke,
      });
      let filename = "";
      vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
        function (this: HTMLAnchorElement) {
          filename = this.download;
        },
      );
      downloadMarkdown(getDemoResult());
      expect(filename).toBe("demo-release-notes-v1.3.0.md");
      expect(blob!.type).toBe("text/markdown;charset=utf-8");
      const content = new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsText(blob!);
      });
      vi.useRealTimers();
      expect(await content).toBe(getDemoResult().markdown);
      // Use real time here because JSDOM FileReader is asynchronous outside fake timers.
      await waitFor(() => expect(revoke).toHaveBeenCalledWith("blob:test"), {
        timeout: 2000,
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
