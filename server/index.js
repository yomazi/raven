// index.js
import "dotenv/config";

import cookieParser from "cookie-parser";
import express from "express";
import fs from "fs";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

import { errorHandler } from "./middlewares/error-handler.js";
import { normalizeAuthHeader } from "./middlewares/normalize-auth-header.js";
import { VITE_CONFIG_FILE } from "./utilities/constants.js";
import { connectDb } from "./utilities/db.js";

// routes
import apiTokensRoutes from "./api-tokens/api-tokens.routes.js";
import authRoutes from "./auth/auth.routes.js";
import googleAuthRoutes from "./auth/google.auth.routes.js";
import contactsRoutes from "./contacts/contacts.routes.js";
import driveRoutes from "./drive/drive.routes.js";
import gmailRoutes from "./gmail/gmail.routes.js";
import groupsRoutes from "./groups/groups.routes.js";
import llmRoutes from "./llm/llm.routes.js";
import showsRoutes from "./shows/shows.routes.js";
import ShowsEvents from "./shows/shows.events.js";
import tasksRoutes from "./tasks/tasks.routes.js";
import reportsRoutes from "./reports/reports.routes.js";
import ReportScheduler from "./reports/report-scheduler.js";
import liveReportsRoutes from "./reports/live-reports/live-reports.routes.js";
import LiveReportService from "./reports/live-reports/live-report.service.js";
import settingsRoutes from "./settings/settings.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(normalizeAuthHeader);

connectDb().then(() => ReportScheduler.start());
ShowsEvents.onChanged((event) => {
  LiveReportService.handleShowChanged(event).catch((err) =>
    console.error("[LiveReportService] handleShowChanged failed:", err)
  );
});

// define API routes with versioning
const version = "v1";
const routePrefix = `/api/${version}`;

app.use("", googleAuthRoutes);
app.use(routePrefix, apiTokensRoutes);
app.use(routePrefix, authRoutes);
app.use(routePrefix, contactsRoutes);
app.use(routePrefix, driveRoutes);
app.use(routePrefix, gmailRoutes);
app.use(routePrefix, groupsRoutes);
app.use(routePrefix, llmRoutes);
app.use(routePrefix, showsRoutes);
app.use(routePrefix, tasksRoutes);
app.use(routePrefix, reportsRoutes);
app.use(routePrefix, liveReportsRoutes);
app.use(routePrefix, settingsRoutes);

// set up Vite middleware for dev (Raven is local-only)

const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

const vite = await createViteServer({
  server: { middlewareMode: true, hmr: { server: httpServer, port: 443, protocol: "wss" } },
  configFile: VITE_CONFIG_FILE,
  root: path.resolve(__dirname, "../client"), // React project root
});
app.use(vite.middlewares);

// SPA fallback catch-all for React Router
app.use(async (req, res, next) => {
  if (req.originalUrl.startsWith("/api")) return next();

  try {
    const indexHtmlPath = path.resolve(__dirname, "../client/index.html");
    const template = await fs.promises.readFile(indexHtmlPath, "utf-8");
    const html = await vite.transformIndexHtml(req.originalUrl, template);

    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  } catch (err) {
    vite.ssrFixStacktrace(err);
    next(err);
  }
});

app.use(errorHandler);

// start the server!
httpServer.listen(PORT, () => console.log(`[Raven] server running on port ${PORT}`));
