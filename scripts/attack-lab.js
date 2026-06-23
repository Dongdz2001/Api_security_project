const BASE_URL = process.env.LAB_BASE_URL || "http://localhost:8080";

const ids = {
  aliceOrder: "90000000-0000-4000-8000-000000000001",
  bobOrder: "90000000-0000-4000-8000-000000000002",
  bob: "22222222-2222-4222-8222-222222222222"
};

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

async function login(prefix, email, password) {
  const result = await request(`/${prefix}/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  if (!result.body.access_token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(result.body)}`);
  }
  return result.body.access_token;
}

function auth(token) {
  return { authorization: `Bearer ${token}` };
}

function printCase(title, result) {
  console.log(`\n=== ${title} ===`);
  console.log(`HTTP ${result.status}`);
  console.log(JSON.stringify(result.body, null, 2));
}

async function main() {
  console.log(`Running API security lab against ${BASE_URL}`);
  const weakAlice = await login("vulnerable", "alice@example.com", "Password123!");
  const secureAlice = await login("secure", "alice@example.com", "Password123!");

  printCase(
    "BOLA vulnerable: Alice reads Bob order",
    await request(`/vulnerable/orders/${ids.bobOrder}`, {
      headers: auth(weakAlice)
    })
  );

  printCase(
    "BOLA secure: Alice is blocked from Bob order",
    await request(`/secure/orders/${ids.bobOrder}`, {
      headers: auth(secureAlice)
    })
  );

  printCase(
    "Excessive data exposure vulnerable: Alice reads Bob raw user row",
    await request(`/vulnerable/users/${ids.bob}`, {
      headers: auth(weakAlice)
    })
  );

  printCase(
    "Mass assignment vulnerable: Alice promotes herself",
    await request("/vulnerable/users/me", {
      method: "PATCH",
      headers: auth(weakAlice),
      body: JSON.stringify({ display_name: "Alice Lab", role: "admin" })
    })
  );

  printCase(
    "Mass assignment secure: role update is rejected by strict schema",
    await request("/secure/users/me", {
      method: "PATCH",
      headers: auth(secureAlice),
      body: JSON.stringify({ display_name: "Alice Lab", role: "admin" })
    })
  );

  printCase(
    "Injection vulnerable: payload is interpolated into SQL",
    await request(
      `/vulnerable/products/search?q=${encodeURIComponent("%' OR true --")}`,
      { headers: auth(weakAlice) }
    )
  );

  printCase(
    "Injection secure: same payload is treated as data",
    await request(`/secure/products/search?q=${encodeURIComponent("%' OR true --")}`, {
      headers: auth(secureAlice)
    })
  );

  printCase(
    "SSRF secure: localhost target is blocked before fetch",
    await request("/secure/payments/preview-callback", {
      method: "POST",
      headers: auth(secureAlice),
      body: JSON.stringify({ callbackUrl: "http://localhost:3001/health" })
    })
  );

  console.log("\nLab finished. Re-run `npm run seed` to reset mass-assignment changes.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
