const jwt = require("jsonwebtoken");
const {
  issueAccessToken,
  issueVulnerableToken
} = require("../services/common/security");
const { config } = require("../services/common/config");
const { vulnerableSearchSql, secureSearchSql } = require("../services/product-service/app");
const { buildSetClause } = require("../services/user-service/app");
const { isAllowedHost, isPrivateIp } = require("../services/payment-service/ssrfGuard");

const demoUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "alice@example.com",
  role: "user"
};

describe("JWT security model", () => {
  it("issues secure access tokens with issuer, audience and expiration", () => {
    const token = issueAccessToken(demoUser);
    const decoded = jwt.verify(token, config.jwt.accessSecret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience
    });

    expect(decoded.sub).toBe(demoUser.id);
    expect(decoded.iss).toBe(config.jwt.issuer);
    expect(decoded.aud).toBe(config.jwt.audience);
    expect(decoded.exp).toBeGreaterThan(decoded.iat);
  });

  it("shows the vulnerable token has no expiration claim", () => {
    const token = issueVulnerableToken(demoUser);
    const decoded = jwt.decode(token);
    expect(decoded.exp).toBeUndefined();
  });
});

describe("Injection prevention", () => {
  it("keeps user input out of the secure SQL template", () => {
    const payload = "%' OR true --";
    expect(vulnerableSearchSql(payload)).toContain(payload);
    expect(secureSearchSql()).toContain("$1");
    expect(secureSearchSql()).not.toContain(payload);
  });
});

describe("Mass assignment contrast", () => {
  it("documents that the vulnerable update path accepts role", () => {
    const update = buildSetClause({ display_name: "Alice", role: "admin" });
    expect(update.keys).toContain("role");
    expect(update.assignments.join(",")).toContain("role =");
  });
});

describe("SSRF guard", () => {
  it("detects private and loopback network targets", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("10.1.2.3")).toBe(true);
    expect(isPrivateIp("172.16.0.7")).toBe(true);
    expect(isPrivateIp("192.168.1.10")).toBe(true);
    expect(isPrivateIp("8.8.8.8")).toBe(false);
  });

  it("only allows configured callback hostnames", () => {
    expect(isAllowedHost("webhook.site", ["webhook.site"])).toBe(true);
    expect(isAllowedHost("tenant.webhook.site", ["webhook.site"])).toBe(true);
    expect(isAllowedHost("localhost", ["webhook.site"])).toBe(false);
  });
});
