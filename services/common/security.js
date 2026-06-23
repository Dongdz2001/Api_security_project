const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const { config } = require("./config");
const { AppError } = require("./errors");

const bearerSchema = z.string().regex(/^Bearer\s+[-_A-Za-z0-9.]+$/);

function publicUserDto(user) {
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    role: user.role,
    created_at: user.created_at
  };
}

function issueVulnerableToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      note: "LAB ONLY: weak token without exp/issuer/audience checks"
    },
    config.jwt.weakSecret,
    { algorithm: "HS256" }
  );
}

function issueAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role
    },
    config.jwt.accessSecret,
    {
      algorithm: "HS256",
      expiresIn: config.jwt.accessTtl,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience
    }
  );
}

function getBearerToken(req) {
  const header = req.headers.authorization;
  if (!header || !bearerSchema.safeParse(header).success) {
    throw new AppError(401, "missing_token", "Missing bearer token");
  }
  return header.replace(/^Bearer\s+/i, "");
}

function authenticateVulnerable(req, res, next) {
  try {
    const token = getBearerToken(req);
    const decoded = jwt.decode(token);
    if (!decoded?.sub) {
      throw new AppError(401, "invalid_token", "Invalid token");
    }
    req.user = decoded;
    return next();
  } catch (err) {
    return next(err);
  }
}

function authenticateSecure(req, res, next) {
  try {
    const token = getBearerToken(req);
    req.user = jwt.verify(token, config.jwt.accessSecret, {
      algorithms: ["HS256"],
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
      clockTolerance: 5
    });
    return next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(new AppError(401, "token_expired", "Access token expired"));
    }
    if (err.name === "JsonWebTokenError") {
      return next(new AppError(401, "invalid_token", "Invalid access token"));
    }
    return next(err);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return next(new AppError(403, "forbidden", "Insufficient permission"));
    }
    return next();
  };
}

function createSecureRateLimiter() {
  return rateLimit({
    windowMs: config.rateLimit.windowMs,
    limit: config.rateLimit.max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
      error: "rate_limited",
      message: "Too many requests. Please slow down."
    }
  });
}

module.exports = {
  publicUserDto,
  issueVulnerableToken,
  issueAccessToken,
  authenticateVulnerable,
  authenticateSecure,
  requireRole,
  createSecureRateLimiter
};
