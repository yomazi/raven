// index.js
require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");
const livereload = require("livereload");
const connectLivereload = require("connect-livereload");
const fs = require("fs");

const { connectDb } = require("./utilities/db.js");
const { waitForFile } = require("./utilities/helpers.js");

const { normalizeAuthHeader } = require("./middlewares/normalize-auth-header.js");
const { errorHandler } = require("./middlewares/error-handler");

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(normalizeAuthHeader);

connectDb();

const googleAuthRoutes = require("./auth/google.auth.routes.js");
const authRoutes = require("./auth/auth.routes");
const performancesRoutes = require("./performances/performances.routes");

const version = "v1";
const routePrefix = `/api/${version}`;

app.use("", googleAuthRoutes);
app.use(routePrefix, authRoutes);
app.use(routePrefix, performancesRoutes);

// **Serve React after all API / OAuth routes**
const reactBuildPath = path.join(__dirname, "../client/dist");
if (!fs.existsSync(reactBuildPath)) {
  fs.mkdirSync(reactBuildPath, { recursive: true });
}

const liveReloadServer = livereload.createServer();
liveReloadServer.watch(reactBuildPath);

app.use(connectLivereload());
app.use(express.static(reactBuildPath));

app.use(errorHandler); // use the error handler middleware

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
