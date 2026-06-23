class AppError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

function notFoundHandler(req, res) {
  res.status(404).json({
    error: "not_found",
    message: `No route for ${req.method} ${req.originalUrl}`
  });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err.name === "ZodError") {
    return res.status(400).json({
      error: "validation_failed",
      message: "Request validation failed",
      details: err.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    });
  }

  const status = err.status || 500;
  const code = err.code || "internal_error";
  const message =
    status >= 500 ? "Internal server error" : err.message || "Request failed";

  req.log?.error({ err, code }, "request failed");
  return res.status(status).json({ error: code, message });
}

module.exports = { AppError, asyncHandler, notFoundHandler, errorHandler };
