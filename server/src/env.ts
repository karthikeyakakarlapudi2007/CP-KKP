import "dotenv/config";

function list(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigins: list(process.env.CORS_ORIGIN ?? "http://localhost:3000"),
  staffApiKey: process.env.STAFF_API_KEY?.trim() || "",
  tzOffsetMinutes: Number(process.env.TZ_OFFSET_MINUTES ?? 330),
  isProd: process.env.NODE_ENV === "production",
};
