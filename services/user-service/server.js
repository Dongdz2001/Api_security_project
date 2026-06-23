const { buildUserApp } = require("./app");
const { startServer } = require("../common/serviceApp");

const { app, logger } = buildUserApp();
startServer(app, logger, Number(process.env.USER_PORT || 3002));
