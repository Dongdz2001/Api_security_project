const baseUrl = window.location.origin;

const ids = {
  bob: "22222222-2222-4222-8222-222222222222",
  bobOrder: "90000000-0000-4000-8000-000000000002"
};

const cases = [
  {
    id: "bola",
    title: "Broken Object Level Authorization",
    short: "Alice đọc order của Bob",
    finding: "Thiếu kiểm tra ownership",
    impact:
      "Bản lỗi chỉ cần token hợp lệ nên Alice đổi orderId là xem được đơn của Bob. Bản secure so sánh user_id của order với sub trong JWT và trả 403.",
    vulnerable: {
      name: "No ownership check",
      method: "GET",
      path: `/vulnerable/orders/${ids.bobOrder}`,
      auth: "weak"
    },
    secure: {
      name: "Ownership enforced",
      method: "GET",
      path: `/secure/orders/${ids.bobOrder}`,
      auth: "secure"
    }
  },
  {
    id: "exposure",
    title: "Excessive Data Exposure",
    short: "API trả thừa dữ liệu",
    finding: "Entity DB bị trả thẳng ra client",
    impact:
      "Bản lỗi làm lộ password_hash, api_key và internal_note. Bản secure dùng DTO nên chỉ trả các trường cần thiết của chính người dùng.",
    vulnerable: {
      name: "Raw user entity",
      method: "GET",
      path: `/vulnerable/users/${ids.bob}`,
      auth: "weak"
    },
    secure: {
      name: "Response DTO",
      method: "GET",
      path: "/secure/users/me",
      auth: "secure"
    }
  },
  {
    id: "mass-assignment",
    title: "Mass Assignment",
    short: "User tự gửi role=admin",
    finding: "Không whitelist field update",
    impact:
      "Bản lỗi nhận role từ request body và cập nhật vào user. Bản secure dùng schema strict nên field role bị reject.",
    vulnerable: {
      name: "Role accepted from body",
      method: "PATCH",
      path: "/vulnerable/users/me",
      auth: "weak",
      body: { display_name: "Alice Lab", role: "admin" }
    },
    secure: {
      name: "Strict schema rejects role",
      method: "PATCH",
      path: "/secure/users/me",
      auth: "secure",
      body: { display_name: "Alice Lab", role: "admin" }
    }
  },
  {
    id: "injection",
    title: "Injection",
    short: "Payload bị nhúng vào SQL",
    finding: "Ghép chuỗi truy vấn từ input",
    impact:
      "Bản lỗi hiển thị câu SQL đã bị chèn payload. Bản secure coi payload là dữ liệu tìm kiếm bình thường nên không trả kết quả.",
    vulnerable: {
      name: "String interpolation",
      method: "GET",
      path: "/vulnerable/products/search?q=%25'%20OR%20true%20--",
      auth: "weak"
    },
    secure: {
      name: "Parameterized query",
      method: "GET",
      path: "/secure/products/search?q=%25'%20OR%20true%20--",
      auth: "secure"
    }
  },
  {
    id: "ssrf",
    title: "SSRF Protection",
    short: "Chặn gọi localhost",
    finding: "Callback URL phải qua allowlist",
    impact:
      "Bản lỗi sẽ fetch URL do user nhập. Bản secure chặn host nội bộ hoặc host không nằm trong allowlist trước khi gọi outbound.",
    vulnerable: {
      name: "User-controlled callback",
      method: "POST",
      path: "/vulnerable/payments/preview-callback",
      auth: "weak",
      body: { callbackUrl: "http://localhost:3001/health" }
    },
    secure: {
      name: "Outbound policy",
      method: "POST",
      path: "/secure/payments/preview-callback",
      auth: "secure",
      body: { callbackUrl: "http://localhost:3001/health" }
    }
  }
];

const state = {
  selectedId: "bola",
  tokens: {
    weak: null,
    secure: null
  },
  results: {}
};

const $ = (selector) => document.querySelector(selector);

function pretty(value) {
  return JSON.stringify(value, null, 2);
}

function statusClass(status) {
  if (!status) return "pending";
  return status >= 200 && status < 300 ? "ok" : "blocked";
}

function statusText(status) {
  if (!status) return "Ready";
  return `HTTP ${status}`;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

async function ensureTokens() {
  if (!state.tokens.weak) {
    const result = await api("/vulnerable/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "alice@example.com",
        password: "Password123!"
      })
    });
    state.tokens.weak = result.body.access_token;
  }

  if (!state.tokens.secure) {
    const result = await api("/secure/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "alice@example.com",
        password: "Password123!"
      })
    });
    state.tokens.secure = result.body.access_token;
  }
}

async function runRequest(definition) {
  await ensureTokens();
  return api(definition.path, {
    method: definition.method,
    headers: {
      authorization: `Bearer ${state.tokens[definition.auth]}`
    },
    body: definition.body ? JSON.stringify(definition.body) : undefined
  });
}

function renderCaseList() {
  const list = $("#caseList");
  list.innerHTML = "";
  for (const item of cases) {
    const button = document.createElement("button");
    button.className = `case-button ${item.id === state.selectedId ? "active" : ""}`;
    button.type = "button";
    button.innerHTML = `<strong>${item.title}</strong><span>${item.short}</span>`;
    button.addEventListener("click", () => {
      state.selectedId = item.id;
      render();
    });
    list.appendChild(button);
  }
}

function renderSummary() {
  const total = cases.length;
  const completed = Object.keys(state.results).length;
  const blocked = Object.values(state.results).filter((result) => result.secure?.status >= 400).length;
  const exposed = Object.values(state.results).filter((result) => result.vulnerable?.status < 300).length;
  const metrics = [
    ["Scenarios", total],
    ["Executed", completed],
    ["Vuln success", exposed],
    ["Secure blocked", blocked]
  ];

  $("#summaryGrid").innerHTML = metrics
    .map(([label, value]) => `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");
}

function renderPanel(side, definition, result) {
  $(`#${side}Name`).textContent = definition.name;
  $(`#${side}Request`).textContent = `${definition.method} ${definition.path}`;
  $(`#${side}Body`).textContent = result ? pretty(result.body) : "{}";
  const badge = $(`#${side}Status`);
  badge.className = `status-badge ${statusClass(result?.status)}`;
  badge.textContent = statusText(result?.status);
}

function render() {
  const selected = cases.find((item) => item.id === state.selectedId);
  const result = state.results[selected.id];

  $("#baseUrl").textContent = baseUrl;
  $("#caseTitle").textContent = selected.title;
  $("#findingTitle").textContent = selected.finding;
  $("#findingText").textContent = selected.impact;

  renderCaseList();
  renderSummary();
  renderPanel("vulnerable", selected.vulnerable, result?.vulnerable);
  renderPanel("secure", selected.secure, result?.secure);
}

async function runCase(caseItem) {
  state.selectedId = caseItem.id;
  render();
  const vulnerable = await runRequest(caseItem.vulnerable);
  const secure = await runRequest(caseItem.secure);
  state.results[caseItem.id] = { vulnerable, secure };
  render();
}

async function runSelected() {
  setBusy(true);
  try {
    await runCase(cases.find((item) => item.id === state.selectedId));
  } finally {
    setBusy(false);
  }
}

async function runAll() {
  setBusy(true);
  try {
    for (const caseItem of cases) {
      await runCase(caseItem);
    }
  } finally {
    setBusy(false);
  }
}

async function resetLab() {
  setBusy(true);
  try {
    await api("/lab/reset", { method: "POST" });
    state.tokens.weak = null;
    state.tokens.secure = null;
    state.results = {};
    render();
  } finally {
    setBusy(false);
  }
}

function setBusy(isBusy) {
  $("#runAllBtn").disabled = isBusy;
  $("#runSelectedBtn").disabled = isBusy;
  $("#resetBtn").disabled = isBusy;
}

async function checkHealth() {
  try {
    const result = await api("/health");
    $("#healthStatus").textContent = result.body.gateway === "ok" ? "Online" : "Check";
  } catch {
    $("#healthStatus").textContent = "Offline";
  }
}

$("#runSelectedBtn").addEventListener("click", runSelected);
$("#runAllBtn").addEventListener("click", runAll);
$("#resetBtn").addEventListener("click", resetLab);

render();
checkHealth();
