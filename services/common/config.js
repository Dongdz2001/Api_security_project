const parseList = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const config = {
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgres://api_lab:api_lab_password@localhost:5432/api_security_lab",
  jwt: {
    accessSecret:
      process.env.JWT_ACCESS_SECRET ||
      "dev-only-change-me-to-a-long-random-secret",
    weakSecret: process.env.WEAK_JWT_SECRET || "secret",
    issuer: process.env.JWT_ISSUER || "api-security-lab",
    audience: process.env.JWT_AUDIENCE || "api-security-demo",
    accessTtl: process.env.JWT_ACCESS_TTL || "15m"
  },
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
    max: Number(process.env.RATE_LIMIT_MAX || 30)
  },
  payment: {
    webhookAllowlist: parseList(
      process.env.PAYMENT_WEBHOOK_ALLOWLIST || "webhook.site,example.com"
    )
  }
};

module.exports = { config };
