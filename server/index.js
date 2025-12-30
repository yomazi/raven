// index.js
require("dotenv").config();

const express = require("express");
const { connectDB } = require("./db.js");
const path = require("path");
const cookieSession = require("cookie-session");
const { createOAuthClientWithSession } = require("./google/client");
const livereload = require("livereload");
const connectLivereload = require("connect-livereload");
const fs = require("fs");

const User = require("./models/User.js"); // example model

const app = express();
app.use(express.json());

connectDB();

const { google } = require("googleapis");

app.use(
  cookieSession({
    name: "session",
    keys: [process.env.SESSION_SECRET],
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    sameSite: "lax", // important for cross-origin dev
    secure: false, // true only for HTTPS
  })
);

const authRoutes = require("./auth/auth.routes");

app.use("/auth", authRoutes);

// simple API endpoint
app.get("/api/data", (req, res) => {
  res.json({ message: "Hello from your local Node server!" });
});

// Example route
app.get("/api/users", async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "Not logged in" });

  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List files in user's Drive root folder
app.get("/api/drive/root", async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "Not logged in" });
  console.log("Session user:", req.session.user);

  try {
    const client = createOAuthClientWithSession(req);
    const drive = google.drive({ version: "v3", auth: client });

    const response = await drive.files.list({
      q: "'root' in parents and trashed = false",
      pageSize: 20,
      fields: "files(id, name, mimeType)",
    });

    res.json(response.data.files);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to list files" });
  }
});

const waitForFile = async (filePath, timeout = 10000, interval = 100) => {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const check = () => {
      if (fs.existsSync(filePath)) {
        return resolve();
      }
      if (Date.now() - start > timeout) {
        return reject(new Error(`File ${filePath} did not appear within ${timeout}ms`));
      }
      setTimeout(check, interval);
    };

    check();
  });
};

// **Serve React after all API / OAuth routes**
const reactBuildPath = path.join(__dirname, "../client/dist");
if (!fs.existsSync(reactBuildPath)) {
  fs.mkdirSync(reactBuildPath, { recursive: true });
}

const liveReloadServer = livereload.createServer();
liveReloadServer.watch(reactBuildPath);

app.use(connectLivereload());

app.use(express.static(reactBuildPath));

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
