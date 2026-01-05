const crypto = require("crypto");

function generateApiToken() {
  return crypto.randomBytes(32).toString("hex");
}

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

module.exports = { generateApiToken, waitForFile };
