export const errorHandler = (error, req, res, next) => {
  const status = error.status || 500;
  const name = error.name || "InternalServerError";
  const message = error.message || "An unexpected error occurred.";

  // Always log errors to help with debugging (will appear in Cloud Run logs)
  console.error(`[ERROR] ${req.method} ${req.originalUrl}`);
  console.error(`Status: ${status}, Name: ${name}`);
  console.error(`Message: ${message}`);
  console.error(error.stack);
  console.error("");

  res.status(status).json({
    name,
    message,
  });
};
