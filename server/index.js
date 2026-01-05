// index.js
const { errorHandler } = require("./middlewares/error-handler");

require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const { connectDb } = require("./utilities/db.js");
const { waitForFile } = require("./utilities/helpers.js");
const path = require("path");
const livereload = require("livereload");
const connectLivereload = require("connect-livereload");
const fs = require("fs");

const User = require("./models/User.js"); // example model

const AuthService = require("./auth/auth.service.js");
const AuthDbRepository = require("./auth/auth.db.repository.js");

const app = express();

app.use(express.json());
app.use(cookieParser());

connectDb();

const { google } = require("googleapis");

const authRoutes = require("./auth/auth.routes");
const performancesRoutes = require("./performances/performances.routes");

app.use("/auth", authRoutes);
app.use("/api", performancesRoutes);

// simple API endpoint
app.get("/api/data", (req, res) => {
  res.json({ message: "Hello from your local Node server!" });
});

// List files in user's Drive root folder
app.get("/api/drive/root", async (req, res) => {
  try {
    const token = req.cookies.apiToken; // <-- read from cookie
    if (!token) return res.sendStatus(401);

    // Find user in DB by apiToken
    const user = await AuthDbRepository.getUserByApiToken(token);
    if (!user) return res.sendStatus(401);

    // Get an authenticated Google client
    const client = AuthService.getGoogleClient(user);

    const drive = google.drive({ version: "v3", auth: client });

    const { data } = await drive.files.list({
      q: "'root' in parents and trashed = false",
      pageSize: 20,
      fields: "files(id, name, mimeType)",
    });

    res.json(data.files);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to list files" });
  }
});

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
