const { buildAuthApp } = require("./app");
const { startServer } = require("../common/serviceApp");

const { app, logger } = buildAuthApp();
startServer(app, logger, Number(process.env.AUTH_PORT || 3001));
