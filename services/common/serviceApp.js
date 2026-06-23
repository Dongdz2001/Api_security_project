const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const pinoHttp = require("pino-http");
const { createLogger } = require("./logger");
const { errorHandler, notFoundHandler } = require("./errors");

function createServiceApp(serviceName) {
  const app = express();
  const logger = createLogger(serviceName);

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "128kb" }));
  app.use(pinoHttp({ logger }));

  app.get("/health", (req, res) => {
    res.json({ service: serviceName, status: "ok" });
  });

  return { app, logger, installErrorHandlers: () => {
    app.use(notFoundHandler);
    app.use(errorHandler);
  } };
}

function startServer(app, logger, port) {
  const server = app.listen(port, () => {
    logger.info({ port }, "service started");
  });

  process.on("SIGTERM", () => {
    logger.info("received SIGTERM");
    server.close(() => process.exit(0));
  });
}

module.exports = { createServiceApp, startServer };
