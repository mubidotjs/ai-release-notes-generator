import type { ErrorCode } from "@release-notes/shared";

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status = 400,
    public retryAfterSeconds?: number,
  ) {
    super(message);
  }
}

export async function readBounded(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
  error: AppError,
) {
  if (!body) return "";
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw error;
      }
      text += decoder.decode(next.value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

export async function withDeadline<T>(
  operation: () => Promise<T>,
  ms: number,
  error: AppError,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(error), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
