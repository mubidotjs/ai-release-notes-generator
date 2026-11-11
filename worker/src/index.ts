import {
  createResult,
  LIMITS,
  MODEL,
  requestSchema,
} from "@release-notes/shared";
import { generateEntries, type AiBinding } from "./ai";
import { AppError, readBounded } from "./errors";
import { fetchComparison } from "./github";

export interface Limiter {
  limit(input: { key: string }): Promise<{ success: boolean }>;
}
export interface Env {
  LIVE_AI_ENABLED?: string;
  ABUSE_CONTROLS_VERIFIED?: string;
  ALLOWED_ORIGINS?: string;
  AI?: AiBinding;
  VISITOR_LIMITER?: Limiter;
  GLOBAL_LIMITER?: Limiter;
}

function liveReady(env: Env) {
  return (
    env.LIVE_AI_ENABLED === "true" &&
    env.ABUSE_CONTROLS_VERIFIED === "true" &&
    !!env.AI &&
    !!env.VISITOR_LIMITER &&
    !!env.GLOBAL_LIMITER
  );
}

export function createHandler(fetcher: typeof fetch = fetch) {
  return async function handle(request: Request, env: Env): Promise<Response> {
    const headers = new Headers({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      Vary: "Origin",
    });
    try {
      const origin = request.headers.get("Origin");
      const allowed = (env.ALLOWED_ORIGINS ?? "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      if (origin && !allowed.includes(origin))
        throw new AppError(
          "ORIGIN_NOT_ALLOWED",
          "This browser origin is not configured for the API.",
          403,
        );
      if (origin) headers.set("Access-Control-Allow-Origin", origin);
      const path = new URL(request.url).pathname;
      if (path !== "/health" && path !== "/api/generate")
        throw new AppError("NOT_FOUND", "Endpoint not found.", 404);
      if (request.method === "OPTIONS") {
        headers.set(
          "Access-Control-Allow-Methods",
          path === "/health" ? "GET, OPTIONS" : "POST, OPTIONS",
        );
        headers.set("Access-Control-Allow-Headers", "Content-Type");
        headers.set("Access-Control-Max-Age", "600");
        return new Response(null, { status: 204, headers });
      }
      if (path === "/health") {
        if (request.method !== "GET")
          throw new AppError(
            "METHOD_NOT_ALLOWED",
            "Use GET for health checks.",
            405,
          );
        return Response.json(
          { status: "ok", liveEnabled: liveReady(env), model: MODEL },
          { headers },
        );
      }
      if (request.method !== "POST")
        throw new AppError(
          "METHOD_NOT_ALLOWED",
          "Use POST to generate notes.",
          405,
        );
      if (
        request.headers
          .get("content-type")
          ?.split(";")[0]
          ?.trim()
          .toLowerCase() !== "application/json"
      ) {
        throw new AppError("INVALID_REQUEST", "Send a JSON request body.", 415);
      }
      const tooLarge = new AppError(
        "PAYLOAD_TOO_LARGE",
        "Request body must not exceed 8 KiB.",
        413,
      );
      if (Number(request.headers.get("content-length")) > LIMITS.requestBytes)
        throw tooLarge;
      const body = await readBounded(
        request.body,
        LIMITS.requestBytes,
        tooLarge,
      );
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new AppError(
          "INVALID_REQUEST",
          "Request body must be valid JSON.",
        );
      }
      const validated = requestSchema.safeParse(parsed);
      if (!validated.success)
        throw new AppError(
          "INVALID_REQUEST",
          validated.error.issues[0]?.message ?? "Invalid comparison input.",
        );
      const liveRequested = env.LIVE_AI_ENABLED === "true";
      // A disabled production Worker can exercise its native limiters without making external calls.
      if (!liveRequested && (!env.VISITOR_LIMITER || !env.GLOBAL_LIMITER)) {
        throw new AppError(
          "LIVE_AI_DISABLED",
          "Live AI generation is disabled. Try Demo for a synthetic example.",
          503,
        );
      }
      const visitor = request.headers.get("CF-Connecting-IP");
      if ((liveRequested && !liveReady(env)) || !visitor)
        throw new AppError(
          "ABUSE_CONTROLS_UNAVAILABLE",
          "Live generation is unavailable until abuse controls are verified.",
          503,
        );
      try {
        const perVisitor = await env.VISITOR_LIMITER!.limit({
          key: `generate:${visitor}`,
        });
        if (!perVisitor.success)
          throw new AppError(
            "RATE_LIMITED",
            "Too many generation attempts. Please wait one minute.",
            429,
            60,
          );
        const aggregate = await env.GLOBAL_LIMITER!.limit({
          key: "generate:all-visitors",
        });
        if (!aggregate.success)
          throw new AppError(
            "RATE_LIMITED",
            "Generation is busy. Please wait one minute.",
            429,
            60,
          );
      } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError(
          "ABUSE_CONTROLS_UNAVAILABLE",
          "Request protection is temporarily unavailable. Try Demo instead.",
          503,
        );
      }
      if (!liveRequested)
        throw new AppError(
          "LIVE_AI_DISABLED",
          "Live AI generation is disabled. Try Demo for a synthetic example.",
          503,
        );
      const { sources, comparison } = await fetchComparison(
        validated.data,
        fetcher,
      );
      const entries = await generateEntries(env.AI!, sources);
      return Response.json(
        createResult({ mode: "live", comparison, entries, sources }),
        { headers },
      );
    } catch (error) {
      const safe =
        error instanceof AppError
          ? error
          : new AppError(
              "INTERNAL_ERROR",
              "Unable to complete generation. Try Demo or try again later.",
              500,
            );
      if (safe.retryAfterSeconds)
        headers.set("Retry-After", String(safe.retryAfterSeconds));
      return Response.json(
        {
          error: {
            code: safe.code,
            message: safe.message,
            ...(safe.retryAfterSeconds
              ? { retryAfterSeconds: safe.retryAfterSeconds }
              : {}),
          },
        },
        { status: safe.status, headers },
      );
    }
  };
}

export default { fetch: createHandler() };
