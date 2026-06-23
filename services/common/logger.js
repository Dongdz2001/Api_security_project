const pino = require("pino");

function createLogger(serviceName) {
  return pino({
    name: serviceName,
    level: process.env.LOG_LEVEL || "info",
    redact: {
      paths: ["req.headers.authorization", "password", "password_hash"],
      censor: "[redacted]"
    }
  });
}

module.exports = { createLogger };
