const { z } = require("zod");
const { query } = require("../common/db");
const { createServiceApp } = require("../common/serviceApp");
const { asyncHandler, AppError } = require("../common/errors");
const {
  authenticateSecure,
  authenticateVulnerable,
  createSecureRateLimiter,
  publicUserDto
} = require("../common/security");

const secureProfileSchema = z.object({
  display_name: z.string().min(2).max(80).optional()
}).strict();

const vulnerableAssignableColumns = new Set([
  "display_name",
  "role",
  "internal_note",
  "api_key"
]);

function buildSetClause(body) {
  const keys = Object.keys(body).filter((key) => vulnerableAssignableColumns.has(key));
  const assignments = keys.map((key, index) => `${key} = $${index + 2}`);
  const values = keys.map((key) => body[key]);
  return { keys, assignments, values };
}

function buildUserApp() {
  const { app, logger, installErrorHandlers } = createServiceApp("user-service");

  app.get(
    "/vulnerable/users/:id",
    authenticateVulnerable,
    asyncHandler(async (req, res) => {
      const result = await query("select * from users where id = $1", [req.params.id]);
      const user = result.rows[0];
      if (!user) {
        throw new AppError(404, "user_not_found", "User not found");
      }
      res.json(user);
    })
  );

  app.patch(
    "/vulnerable/users/me",
    authenticateVulnerable,
    asyncHandler(async (req, res) => {
      const { assignments, values } = buildSetClause(req.body);
      if (assignments.length === 0) {
        throw new AppError(400, "empty_update", "No assignable fields provided");
      }
      const result = await query(
        `update users set ${assignments.join(", ")} where id = $1 returning *`,
        [req.user.sub, ...values]
      );
      res.json({
        risk: "mass_assignment_allows_role_or_internal_fields",
        user: result.rows[0]
      });
    })
  );

  app.get(
    "/secure/users/me",
    authenticateSecure,
    createSecureRateLimiter(),
    asyncHandler(async (req, res) => {
      const result = await query("select * from users where id = $1", [req.user.sub]);
      if (!result.rows[0]) {
        throw new AppError(404, "user_not_found", "User not found");
      }
      res.json(publicUserDto(result.rows[0]));
    })
  );

  app.patch(
    "/secure/users/me",
    authenticateSecure,
    createSecureRateLimiter(),
    asyncHandler(async (req, res) => {
      const body = secureProfileSchema.parse(req.body);
      if (!body.display_name) {
        throw new AppError(400, "empty_update", "No allowed fields provided");
      }
      const result = await query(
        "update users set display_name = $2 where id = $1 returning *",
        [req.user.sub, body.display_name]
      );
      res.json(publicUserDto(result.rows[0]));
    })
  );

  installErrorHandlers();
  return { app, logger };
}

module.exports = { buildUserApp, buildSetClause };
