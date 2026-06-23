const bcrypt = require("bcryptjs");
const { z } = require("zod");
const { query } = require("../common/db");
const { createServiceApp } = require("../common/serviceApp");
const { asyncHandler, AppError } = require("../common/errors");
const {
  issueAccessToken,
  issueVulnerableToken,
  publicUserDto,
  createSecureRateLimiter
} = require("../common/security");

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

function buildAuthApp() {
  const { app, logger, installErrorHandlers } = createServiceApp("auth-service");

  async function loadUser(email) {
    const result = await query("select * from users where email = $1", [email]);
    return result.rows[0];
  }

  async function validateCredentials(req) {
    const body = loginSchema.parse(req.body);
    const user = await loadUser(body.email);
    if (!user || !(await bcrypt.compare(body.password, user.password_hash))) {
      throw new AppError(401, "invalid_credentials", "Invalid email or password");
    }
    return user;
  }

  app.post(
    "/vulnerable/auth/login",
    asyncHandler(async (req, res) => {
      const user = await validateCredentials(req);
      res.json({
        access_token: issueVulnerableToken(user),
        token_type: "Bearer",
        risk: "weak_jwt_no_exp_and_decoded_without_verification",
        user: publicUserDto(user)
      });
    })
  );

  app.post(
    "/secure/auth/login",
    createSecureRateLimiter(),
    asyncHandler(async (req, res) => {
      const user = await validateCredentials(req);
      res.json({
        access_token: issueAccessToken(user),
        token_type: "Bearer",
        expires_in: "15m",
        user: publicUserDto(user)
      });
    })
  );

  installErrorHandlers();
  return { app, logger };
}

module.exports = { buildAuthApp };
