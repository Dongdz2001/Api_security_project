const { buildPaymentApp } = require("./app");
const { startServer } = require("../common/serviceApp");

const { app, logger } = buildPaymentApp();
startServer(app, logger, Number(process.env.PAYMENT_PORT || 3005));
