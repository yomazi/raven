// index.js
import "dotenv/config";

import connectLivereload from "connect-livereload";
import cookieParser from "cookie-parser";
import express from "express";
import fs from "fs";
import livereload from "livereload";
import path from "path";
import { fileURLToPath } from "url";

import { connectDb } from "./utilities/db.js";
import { waitForFile } from "./utilities/helpers.js";

import { errorHandler } from "./middlewares/error-handler.js";
import { normalizeAuthHeader } from "./middlewares/normalize-auth-header.js";

// routes
import authRoutes from "./auth/auth.routes.js";
import googleAuthRoutes from "./auth/google.auth.routes.js";
import showsRoutes from "./shows/shows.routes.js";

const __filename = fileURLToPath(import.meta.url); // absolute path to this file
const __dirname = path.dirname(__filename); // directory containing this file

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(normalizeAuthHeader);

connectDb();

const version = "v1";
const routePrefix = `/api/${version}`;

app.use("", googleAuthRoutes);
app.use(routePrefix, authRoutes);
app.use(routePrefix, showsRoutes);

// **Serve React after all API / OAuth routes**
const reactBuildPath = path.join(__dirname, "../client/dist");

// ensure that the build path folder exists
if (!fs.existsSync(reactBuildPath)) {
  fs.mkdirSync(reactBuildPath, { recursive: true });
}

// setup live reload server
const liveReloadServer = livereload.createServer({
  exts: ["js", "css", "html"], // watch only relevant file types
  delay: 100, // slight debounce to avoid multiple triggers
});
liveReloadServer.watch(reactBuildPath);

app.use(connectLivereload()); // tells express to use the live reload script

// Serve static React files
app.use(
  express.static(reactBuildPath, {
    maxAge: 0, // disable caching during dev for instant reloads
  })
);

app.use(errorHandler); // use the error handler middleware

// Serve up the React app for all non-API routes
app.get(/^\/(?!api).*/, async (req, res) => {
  const indexPath = path.join(reactBuildPath, "index.html");
  try {
    await waitForFile(indexPath);
    res.sendFile(indexPath);
  } catch (err) {
    res.status(503).send("React build not ready yet. Please refresh in a moment.");
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
