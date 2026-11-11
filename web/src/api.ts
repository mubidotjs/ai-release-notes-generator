import {
  errorSchema,
  resultSchema,
  type GenerateRequest,
} from "@release-notes/shared";

const configuredUrl = import.meta.env.VITE_WORKER_URL as string | undefined;
export const workerUrl =
  configuredUrl || (import.meta.env.DEV ? "http://127.0.0.1:8787" : "");

export async function generateNotes(
  input: GenerateRequest,
  signal: AbortSignal,
) {
  if (!workerUrl)
    throw new Error(
      "Live service is not configured. Try Demo for a synthetic example.",
    );
  let response: Response;
  try {
    response = await fetch(`${workerUrl.replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: AbortSignal.any([signal, AbortSignal.timeout(65000)]),
    });
  } catch {
    throw new Error(
      "The live service could not be reached or timed out. Try Demo or try again later.",
    );
  }
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      "The service returned an unreadable response. Try again later.",
    );
  }
  if (!response.ok) {
    const error = errorSchema.safeParse(data);
    if (error.success) {
      const retry = error.data.error.retryAfterSeconds;
      throw new Error(
        `${error.data.error.message}${retry ? ` Retry in ${retry} seconds.` : ""}`,
      );
    }
    throw new Error("Generation failed. Try Demo or try again later.");
  }
  const result = resultSchema.safeParse(data);
  if (!result.success)
    throw new Error(
      "The service returned invalid release notes. No output was accepted.",
    );
  return result.data;
}
