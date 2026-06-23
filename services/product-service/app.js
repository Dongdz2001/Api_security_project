const { z } = require("zod");
const { query } = require("../common/db");
const { createServiceApp } = require("../common/serviceApp");
const { asyncHandler } = require("../common/errors");
const {
  authenticateSecure,
  authenticateVulnerable,
  createSecureRateLimiter
} = require("../common/security");

const searchSchema = z.object({
  q: z.string().trim().min(1).max(60)
});

function vulnerableSearchSql(term) {
  return `
    select id, sku, name, description, price
    from products
    where name ilike '%${term}%'
       or sku ilike '%${term}%'
       or description ilike '%${term}%'
    order by name
    limit 20
  `;
}

function secureSearchSql() {
  return `
    select id, sku, name, description, price
    from products
    where name ilike $1
       or sku ilike $1
       or description ilike $1
    order by name
    limit 20
  `;
}

function buildProductApp() {
  const { app, logger, installErrorHandlers } = createServiceApp("product-service");

  app.get(
    "/vulnerable/products/search",
    authenticateVulnerable,
    asyncHandler(async (req, res) => {
      const sql = vulnerableSearchSql(String(req.query.q || ""));
      const result = await query(sql);
      res.json({
        risk: "sql_injection_by_string_interpolation",
        query_used_in_lab: sql.trim(),
        items: result.rows
      });
    })
  );

  app.get(
    "/secure/products/search",
    authenticateSecure,
    createSecureRateLimiter(),
    asyncHandler(async (req, res) => {
      const { q } = searchSchema.parse(req.query);
      const result = await query(secureSearchSql(), [`%${q}%`]);
      res.json({ items: result.rows });
    })
  );

  installErrorHandlers();
  return { app, logger };
}

module.exports = { buildProductApp, vulnerableSearchSql, secureSearchSql };
