export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
/** Socket.IO server — the same Render service as the API unless you split them */
export const SOCKET_URL = (process.env.NEXT_PUBLIC_SOCKET_URL || API_URL).replace(/\/$/, "");

export function siteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  return typeof window !== "undefined" ? window.location.origin : "";
}
