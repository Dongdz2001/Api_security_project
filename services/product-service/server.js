const { buildProductApp } = require("./app");
const { startServer } = require("../common/serviceApp");

const { app, logger } = buildProductApp();
startServer(app, logger, Number(process.env.PRODUCT_PORT || 3003));
