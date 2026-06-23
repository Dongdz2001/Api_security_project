const { z } = require("zod");
const { createServiceApp } = require("../common/serviceApp");
const { asyncHandler } = require("../common/errors");
const {
  authenticateSecure,
  authenticateVulnerable,
  createSecureRateLimiter
} = require("../common/security");
const { validateOutboundUrl } = require("./ssrfGuard");

const callbackSchema = z.object({
  callbackUrl: z.string().url()
});

async function fetchPreview(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const text = await response.text();
    return {
      status: response.status,
      preview: text.slice(0, 200)
    };
  } finally {
    clearTimeout(timeout);
  }
}

function buildPaymentApp() {
  const { app, logger, installErrorHandlers } = createServiceApp("payment-service");

  app.post(
    "/vulnerable/payments/preview-callback",
    authenticateVulnerable,
    asyncHandler(async (req, res) => {
      const { callbackUrl } = callbackSchema.parse(req.body);
      const preview = await fetchPreview(callbackUrl);
      res.json({
        risk: "ssrf_fetches_user_controlled_url_without_network_policy",
        target: callbackUrl,
        preview
      });
    })
  );

  app.post(
    "/secure/payments/preview-callback",
    authenticateSecure,
    createSecureRateLimiter(),
    asyncHandler(async (req, res) => {
      const { callbackUrl } = callbackSchema.parse(req.body);
      const safeUrl = await validateOutboundUrl(callbackUrl);
      const preview = await fetchPreview(safeUrl);
      res.json({ target: safeUrl, preview });
    })
  );

  installErrorHandlers();
  return { app, logger };
}

module.exports = { buildPaymentApp, fetchPreview };
