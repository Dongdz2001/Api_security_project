const { query } = require("../common/db");
const { createServiceApp } = require("../common/serviceApp");
const { asyncHandler, AppError } = require("../common/errors");
const {
  authenticateSecure,
  authenticateVulnerable,
  createSecureRateLimiter
} = require("../common/security");

async function loadOrder(orderId) {
  const result = await query(
    `select o.id, o.user_id, o.status, o.total_amount, o.shipping_address,
            o.internal_fraud_score, o.created_at,
            json_agg(json_build_object(
              'sku', p.sku,
              'name', p.name,
              'quantity', oi.quantity,
              'unit_price', oi.unit_price
            )) as items
     from orders o
     join order_items oi on oi.order_id = o.id
     join products p on p.id = oi.product_id
     where o.id = $1
     group by o.id`,
    [orderId]
  );
  return result.rows[0];
}

function orderDto(order) {
  return {
    id: order.id,
    status: order.status,
    total_amount: order.total_amount,
    shipping_address: order.shipping_address,
    created_at: order.created_at,
    items: order.items
  };
}

function buildOrderApp() {
  const { app, logger, installErrorHandlers } = createServiceApp("order-service");

  app.get(
    "/vulnerable/orders/:id",
    authenticateVulnerable,
    asyncHandler(async (req, res) => {
      const order = await loadOrder(req.params.id);
      if (!order) {
        throw new AppError(404, "order_not_found", "Order not found");
      }
      res.json({
        risk: "broken_object_level_authorization_no_ownership_check",
        order
      });
    })
  );

  app.get(
    "/secure/orders/:id",
    authenticateSecure,
    createSecureRateLimiter(),
    asyncHandler(async (req, res) => {
      const order = await loadOrder(req.params.id);
      if (!order) {
        throw new AppError(404, "order_not_found", "Order not found");
      }
      if (order.user_id !== req.user.sub && req.user.role !== "admin") {
        req.log.warn(
          { actor: req.user.sub, orderId: req.params.id },
          "blocked BOLA attempt"
        );
        throw new AppError(403, "ownership_required", "Order belongs to another user");
      }
      res.json(orderDto(order));
    })
  );

  installErrorHandlers();
  return { app, logger };
}

module.exports = { buildOrderApp, orderDto };
