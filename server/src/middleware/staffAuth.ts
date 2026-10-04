import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../env";

export function isValidStaffKey(key: unknown): boolean {
  if (!env.staffApiKey) return true; // staff key disabled (local dev)
  if (typeof key !== "string") return false;
  const a = Buffer.from(key);
  const b = Buffer.from(env.staffApiKey);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Guards merchant/kitchen endpoints with the optional shared STAFF_API_KEY. */
export function requireStaff(req: Request, res: Response, next: NextFunction) {
  if (isValidStaffKey(req.header("x-staff-key"))) return next();
  res.status(401).json({ error: "Staff key required" });
}
