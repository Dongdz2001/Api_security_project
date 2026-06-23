const { buildOrderApp } = require("./app");
const { startServer } = require("../common/serviceApp");

const { app, logger } = buildOrderApp();
startServer(app, logger, Number(process.env.ORDER_PORT || 3004));
