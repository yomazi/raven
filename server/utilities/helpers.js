const cookifyApiToken = (res, apiToken) => {
  if (apiToken) {
    res.cookie("apiToken", apiToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    });
  }
};

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

module.exports = { cookifyApiToken, waitForFile };
