const errorHandler = (error, req, res, next) => {
  const status = error.status || 500;
  const name = error.name || "InternalServerError";
  const message = error.message || "An unexpected error occurred.";

  console.log(`${req.method} ${req.originalUrl}`);
  console.error(error.stack);
  console.log("");

  res.status(status).json({
    name,
    message,
  });
};

module.exports = { errorHandler };
