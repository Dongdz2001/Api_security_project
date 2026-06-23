const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");

const PORT = Number(process.env.PORT || 8080);
const WEAK_SECRET = "secret";
const ACCESS_SECRET = "local-lab-change-me-to-a-long-secret";
const ISSUER = "api-security-lab";
const AUDIENCE = "api-security-demo";

const ids = {
  alice: "11111111-1111-4111-8111-111111111111",
  bob: "22222222-2222-4222-8222-222222222222",
  admin: "33333333-3333-4333-8333-333333333333",
  laptop: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  keyboard: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  camera: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  orderAlice: "90000000-0000-4000-8000-000000000001",
  orderBob: "90000000-0000-4000-8000-000000000002"
};

const users = [
  {
    id: ids.alice,
    email: "alice@example.com",
    password: "Password123!",
    password_hash: "$2a$10$demo_hash_should_not_leak_alice",
    role: "user",
    display_name: "Alice Nguyen",
    api_key: "ak_live_alice_should_not_leak",
    internal_note: "VIP discount: 5%",
    created_at: "2026-06-23T00:00:00.000Z"
  },
  {
    id: ids.bob,
    email: "bob@example.com",
    password: "Password123!",
    password_hash: "$2a$10$demo_hash_should_not_leak_bob",
    role: "user",
    display_name: "Bob Tran",
    api_key: "ak_live_bob_should_not_leak",
    internal_note: "Manual review required",
    created_at: "2026-06-23T00:00:00.000Z"
  },
  {
    id: ids.admin,
    email: "admin@example.com",
    password: "Admin123!",
    password_hash: "$2a$10$demo_hash_should_not_leak_admin",
    role: "admin",
    display_name: "Security Admin",
    api_key: "ak_live_admin_should_not_leak",
    internal_note: "Can review fraud scores",
    created_at: "2026-06-23T00:00:00.000Z"
  }
];

const products = [
  {
    id: ids.laptop,
    sku: "LAP-13",
    name: "Laptop 13 inch",
    description: "Developer laptop for API testing",
    price: "1299.00"
  },
  {
    id: ids.keyboard,
    sku: "KEY-MECH",
    name: "Mechanical Keyboard",
    description: "Compact keyboard",
    price: "119.00"
  },
  {
    id: ids.camera,
    sku: "CAM-HD",
    name: "HD Webcam",
    description: "Webcam for remote demos",
    price: "79.00"
  }
];

const orders = [
  {
    id: ids.orderAlice,
    user_id: ids.alice,
    status: "paid",
    total_amount: "1418.00",
    shipping_address: "District 1, Ho Chi Minh City",
    internal_fraud_score: 12,
    created_at: "2026-06-23T00:00:00.000Z",
    items: [
      { sku: "LAP-13", name: "Laptop 13 inch", quantity: 1, unit_price: "1299.00" },
      { sku: "KEY-MECH", name: "Mechanical Keyboard", quantity: 1, unit_price: "119.00" }
    ]
  },
  {
    id: ids.orderBob,
    user_id: ids.bob,
    status: "pending",
    total_amount: "79.00",
    shipping_address: "Cau Giay, Ha Noi",
    internal_fraud_score: 64,
    created_at: "2026-06-23T00:00:00.000Z",
    items: [{ sku: "CAM-HD", name: "HD Webcam", quantity: 1, unit_price: "79.00" }]
  }
];

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "128kb" }));

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const profileSchema = z.object({
  display_name: z.string().min(2).max(80).optional()
}).strict();

const secureLimiter = rateLimit({
  windowMs: 60000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "rate_limited",
    message: "Too many requests. Please slow down."
  }
});

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    role: user.role,
    created_at: user.created_at
  };
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

function getToken(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    const err = new Error("Missing bearer token");
    err.status = 401;
    err.code = "missing_token";
    throw err;
  }
  return header.slice("Bearer ".length);
}

function authVulnerable(req, res, next) {
  try {
    const decoded = jwt.decode(getToken(req));
    if (!decoded?.sub) {
      const err = new Error("Invalid token");
      err.status = 401;
      err.code = "invalid_token";
      throw err;
    }
    req.user = decoded;
    next();
  } catch (err) {
    next(err);
  }
}

function authSecure(req, res, next) {
  try {
    req.user = jwt.verify(getToken(req), ACCESS_SECRET, {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE
    });
    next();
  } catch (err) {
    err.status = 401;
    err.code = err.name === "TokenExpiredError" ? "token_expired" : "invalid_token";
    next(err);
  }
}

function login(req, res, secure) {
  const body = loginSchema.parse(req.body);
  const user = users.find((item) => item.email === body.email);
  if (!user || user.password !== body.password) {
    return res.status(401).json({
      error: "invalid_credentials",
      message: "Invalid email or password"
    });
  }

  const payload = { sub: user.id, email: user.email, role: user.role };
  const accessToken = secure
    ? jwt.sign(payload, ACCESS_SECRET, {
        algorithm: "HS256",
        expiresIn: "15m",
        issuer: ISSUER,
        audience: AUDIENCE
      })
    : jwt.sign(
        {
          ...payload,
          note: "LAB ONLY: weak token without exp/issuer/audience checks"
        },
        WEAK_SECRET,
        { algorithm: "HS256" }
      );

  res.json({
    access_token: accessToken,
    token_type: "Bearer",
    ...(secure ? { expires_in: "15m" } : { risk: "weak_jwt_no_exp_and_decoded_without_verification" }),
    user: publicUser(user)
  });
}

app.get("/health", (req, res) => {
  res.json({ gateway: "ok", mode: "local-node-lab" });
});

app.post("/vulnerable/auth/login", (req, res, next) => {
  try {
    login(req, res, false);
  } catch (err) {
    next(err);
  }
});

app.post("/secure/auth/login", secureLimiter, (req, res, next) => {
  try {
    login(req, res, true);
  } catch (err) {
    next(err);
  }
});

app.get("/vulnerable/users/:id", authVulnerable, (req, res) => {
  const user = users.find((item) => item.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: "user_not_found", message: "User not found" });
  }
  res.json(user);
});

app.patch("/vulnerable/users/me", authVulnerable, (req, res) => {
  const user = users.find((item) => item.id === req.user.sub);
  const allowedByBug = ["display_name", "role", "internal_note", "api_key"];
  for (const key of allowedByBug) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) {
      user[key] = req.body[key];
    }
  }
  res.json({
    risk: "mass_assignment_allows_role_or_internal_fields",
    user
  });
});

app.get("/secure/users/me", authSecure, secureLimiter, (req, res) => {
  const user = users.find((item) => item.id === req.user.sub);
  res.json(publicUser(user));
});

app.patch("/secure/users/me", authSecure, secureLimiter, (req, res, next) => {
  try {
    const body = profileSchema.parse(req.body);
    const user = users.find((item) => item.id === req.user.sub);
    if (body.display_name) {
      user.display_name = body.display_name;
    }
    res.json(publicUser(user));
  } catch (err) {
    next(err);
  }
});

app.get("/vulnerable/orders/:id", authVulnerable, (req, res) => {
  const order = orders.find((item) => item.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: "order_not_found", message: "Order not found" });
  }
  res.json({
    risk: "broken_object_level_authorization_no_ownership_check",
    order
  });
});

app.get("/secure/orders/:id", authSecure, secureLimiter, (req, res) => {
  const order = orders.find((item) => item.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: "order_not_found", message: "Order not found" });
  }
  if (order.user_id !== req.user.sub && req.user.role !== "admin") {
    console.warn(
      JSON.stringify({
        event: "blocked_bola_attempt",
        actor: req.user.sub,
        orderId: req.params.id
      })
    );
    return res.status(403).json({
      error: "ownership_required",
      message: "Order belongs to another user"
    });
  }
  res.json(orderDto(order));
});

app.get("/vulnerable/products/search", authVulnerable, (req, res) => {
  const term = String(req.query.q || "");
  const sql = `
    select id, sku, name, description, price
    from products
    where name ilike '%${term}%'
       or sku ilike '%${term}%'
       or description ilike '%${term}%'
    order by name
    limit 20
  `;
  const normalized = term.toLowerCase();
  const injectionTriggered = /'\s+or\s+true|--/i.test(term);
  const items = injectionTriggered
    ? products
    : products.filter((item) =>
        `${item.name} ${item.sku} ${item.description}`.toLowerCase().includes(normalized)
      );

  res.json({
    risk: "sql_injection_by_string_interpolation",
    query_used_in_lab: sql.trim(),
    items
  });
});

app.get("/secure/products/search", authSecure, secureLimiter, (req, res, next) => {
  try {
    const q = z.string().trim().min(1).max(60).parse(req.query.q);
    const normalized = q.toLowerCase();
    res.json({
      items: products.filter((item) =>
        `${item.name} ${item.sku} ${item.description}`.toLowerCase().includes(normalized)
      )
    });
  } catch (err) {
    next(err);
  }
});

app.post("/vulnerable/payments/preview-callback", authVulnerable, async (req, res, next) => {
  try {
    const callbackUrl = z.string().url().parse(req.body.callbackUrl);
    res.json({
      risk: "ssrf_fetches_user_controlled_url_without_network_policy",
      target: callbackUrl,
      preview: {
        status: 200,
        preview: "LAB SIMULATION: vulnerable service would fetch this user-controlled URL."
      }
    });
  } catch (err) {
    next(err);
  }
});

app.post("/secure/payments/preview-callback", authSecure, secureLimiter, (req, res, next) => {
  try {
    const callbackUrl = z.string().url().parse(req.body.callbackUrl);
    const parsed = new URL(callbackUrl);
    const host = parsed.hostname.toLowerCase();
    const allowed =
      host === "webhook.site" || host.endsWith(".webhook.site") || host === "example.com";
    const privateTarget =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);

    if (!allowed || privateTarget) {
      return res.status(403).json({
        error: privateTarget ? "private_ip_blocked" : "host_not_allowed",
        message: privateTarget
          ? "Private network targets are blocked"
          : "Callback host is not allowlisted"
      });
    }

    res.json({
      target: callbackUrl,
      preview: {
        status: 200,
        preview: "LAB SIMULATION: safe callback host accepted."
      }
    });
  } catch (err) {
    next(err);
  }
});

app.use((req, res) => {
  res.status(404).json({
    error: "not_found",
    message: `No route for ${req.method} ${req.originalUrl}`
  });
});

app.use((err, req, res, next) => {
  if (err.name === "ZodError") {
    return res.status(400).json({
      error: "validation_failed",
      message: "Request validation failed",
      details: err.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    });
  }

  res.status(err.status || 500).json({
    error: err.code || "internal_error",
    message: err.status ? err.message : "Internal server error"
  });
});

app.listen(PORT, () => {
  console.log(`Local API security lab is running at http://localhost:${PORT}`);
  console.log("Press Ctrl+C to stop, or run scripts\\stop-local-lab.ps1.");
});
