import http from "node:http";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { prisma } from "./db";
import { env } from "./env";
import { errorHandler, notFound } from "./middleware/errors";
import { analyticsRouter } from "./routes/analytics";
import { menuRouter } from "./routes/menu";
import { ordersRouter } from "./routes/orders";
import { tablesRouter } from "./routes/tables";
import { initSocket } from "./socket";

const app = express();
app.set("trust proxy", 1); // Render sits behind a proxy (rate limiting needs real IPs)
app.use(helmet());
app.use(cors({ origin: env.corsOrigins, allowedHeaders: ["Content-Type", "x-staff-key"] }));
app.use(express.json({ limit: "100kb" }));

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

/** Lets the web app know whether a staff key is required (never reveals the key). */
app.get("/api/config", (_req, res) => {
  res.json({ staff_key_required: Boolean(env.staffApiKey) });
});

app.use("/api", menuRouter, ordersRouter, tablesRouter, analyticsRouter);
app.use(notFound);
app.use(errorHandler);

const server = http.createServer(app);
initSocket(server);

server.listen(env.port, () => {
  console.log(`[kodikura] API + realtime gateway on :${env.port} (CORS: ${env.corsOrigins.join(", ")})`);
});

const shutdown = async (signal: string) => {
  console.log(`[kodikura] ${signal} received, shutting down`);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
