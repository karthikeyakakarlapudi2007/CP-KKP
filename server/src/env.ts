import "dotenv/config";

function list(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const DEFAULT_ORIGINS = "http://localhost:3000";

export const env = {
  port: Number(process.env.PORT ?? 4000),
  /** e.g. "http://localhost:3000,https://kodikura.vercel.app,https://kodikura-*.vercel.app" */
  corsOrigins: list(process.env.CORS_ORIGIN || DEFAULT_ORIGINS),
  staffApiKey: process.env.STAFF_API_KEY?.trim() || "",
  tzOffsetMinutes: Number(process.env.TZ_OFFSET_MINUTES ?? 330),
  isProd: process.env.NODE_ENV === "production",
};

/**
 * Exact origins plus `*` wildcards (one DNS label), so Vercel preview URLs such as
 * https://kodikura-git-feature-team.vercel.app can be allowed with https://kodikura-*.vercel.app.
 */
const originMatchers = env.corsOrigins.map((pattern) => {
  const escaped = pattern.replace(/\/+$/, "").replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[a-z0-9-]+");
  return new RegExp(`^${escaped}$`, "i");
});

export function isAllowedOrigin(origin: string | undefined): boolean {
  // same-origin requests, curl and server-to-server health checks send no Origin header
  if (!origin) return true;
  return originMatchers.some((re) => re.test(origin));
}

/** Shared by Express `cors` and Socket.IO. */
export const corsOrigin = (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) =>
  cb(null, isAllowedOrigin(origin));
