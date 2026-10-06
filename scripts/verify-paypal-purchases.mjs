#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { NextRequest } = require("next/server");
process.env.PAYPAL_CLIENT_ID = "mock-client";
process.env.PAYPAL_CLIENT_SECRET = "mock-secret";
process.env.PAYPAL_MERCHANT_ID = "MOCKMERCHANT1";
process.env.PAYPAL_ENVIRONMENT = "sandbox";
process.env.PURCHASE_COOKIE_SECRET = "mock-independent-signing-secret-over-thirty-two-characters";
process.env.ATOMICMOTION_APP_URL = "https://atomicmotion.example";
process.env.NODE_ENV = "test";
delete process.env.STRIPE_SECRET_KEY;
const orders = new Map();
const captures = new Map();
let captureCalls = 0;
let lastCreate;
let lastRequestId;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  assert.equal(new URL(url).origin, "https://api-m.sandbox.paypal.com", "Never sends tests to live PayPal");
  const endpoint = new URL(url).pathname;
  let payload;
  if (endpoint === "/v1/oauth2/token") payload = { access_token: "mock-access-token" };
  else if (endpoint === "/v2/checkout/orders" && init.method === "POST") {
    lastCreate = JSON.parse(init.body);
    const id = `MOCKORDER${String(orders.size + 1).padStart(8, "0")}`;
    payload = { ...lastCreate, id, status: "CREATED", links: [{ rel: "payer-action", href: `https://www.sandbox.paypal.com/checkoutnow?token=${id}` }] };
    orders.set(id, payload);
  } else if (/\/v2\/checkout\/orders\/[A-Z0-9]+\/capture$/.test(endpoint)) {
    captureCalls++;
    lastRequestId = init.headers["PayPal-Request-Id"];
    const order = orders.get(endpoint.split("/")[4]);
    order.status = "COMPLETED";
    const capture = { id: `CAPTURE${captureCalls}`, status: "COMPLETED", final_capture: true, amount: order.purchase_units[0].amount };
    order.purchase_units[0].payments = { captures: [capture] };
    captures.set(capture.id, capture);
    payload = order;
  } else if (endpoint.startsWith("/v2/checkout/orders/")) payload = orders.get(endpoint.split("/").at(-1));
  else if (endpoint.startsWith("/v2/payments/captures/")) payload = captures.get(endpoint.split("/").at(-1));
  else throw new Error(`Unexpected mock endpoint: ${endpoint}`);
  return Response.json(payload ?? { error: "not found" }, { status: payload ? 200 : 404 });
};
const moduleCache = new Map();
function load(file) {
  const filename = path.resolve(file);
  if (moduleCache.has(filename)) return moduleCache.get(filename).exports;
  const mod = { exports: {} }; moduleCache.set(filename, mod);
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true }, fileName: filename });
  const localRequire = (specifier) => {
    if (specifier === "server-only") return {};
    if (specifier.startsWith("@/")) {
      const resolved = `src/${specifier.slice(2)}`;
      return resolved.endsWith(".json") ? require(path.resolve(resolved)) : load(`${resolved}.ts`);
    }
    return require(specifier);
  };
  vm.runInThisContext(`(function(require,module,exports){${outputText}\n})`, { filename })(localRequire, mod, mod.exports);
  return mod.exports;
}
const paypal = load("src/lib/paypal.ts");
const purchases = load("src/lib/purchases.ts");
const checkout = load("src/app/api/checkout/route.ts");
const callback = load("src/app/api/paypal/return/route.ts");
const source = load("src/app/api/components/[id]/source/route.ts");
const request = (pathname, cookie = "", body) => new NextRequest(`https://atomicmotion.example${pathname}`, { method: body ? "POST" : "GET", headers: { cookie, origin: "https://atomicmotion.example", "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
const sourceRequest = (id, cookie) => source.GET(request(`/api/components/${id}/source`, cookie), { params: Promise.resolve({ id }) });
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
try {
  check(purchases.paymentsConfigured(), "PayPal works without Stripe configuration");
  check((await sourceRequest("voice-bloom", "")).status === 403, "Unpaid source stays locked");
  check((await checkout.POST(request("/api/checkout", "", { id: "gemini-live" }))).status === 404, "Free source cannot be charged");
  const purchase = await checkout.POST(request("/api/checkout", "", { id: "voice-bloom", price: 1 }));
  check(purchase.status === 200, "PayPal order creates checkout");
  const cookie = purchase.cookies.getAll().map(({ name, value }) => `${name}=${value}`).join("; ");
  const orderId = purchases.getPayPalReceipt(request("/", cookie), "voice-bloom");
  const order = orders.get(orderId);
  check(lastCreate.purchase_units[0].amount.value === "5.00", "Price comes from the server, never the browser");
  check(lastCreate.purchase_units[0].payee.merchant_id === "MOCKMERCHANT1", "Order sends funds to the configured merchant");
  check(lastCreate.payment_source.paypal.experience_context.shipping_preference === "NO_SHIPPING", "Digital source requires no shipping address");
  check(lastCreate.payment_source.paypal.experience_context.return_url.includes("/api/paypal/return?id=voice-bloom"), "Return goes through server verification");
  const repeated = await checkout.POST(request("/api/checkout", cookie, { id: "voice-bloom" }));
  check((await repeated.json()).url === (await purchase.json()).url && orders.size === 1, "Repeat checkout reuses the pending order");
  check((await sourceRequest("voice-bloom", cookie)).status === 403, "An order receipt alone cannot unlock source");
  order.status = "APPROVED";
  check((await sourceRequest("voice-bloom", cookie)).status === 403, "Approval without captured funds cannot unlock source");
  const wrongToken = await callback.GET(request("/api/paypal/return?id=voice-bloom&token=FOREIGNORDER123", cookie));
  check(wrongToken.headers.get("location").endsWith("checkout=failed") && captureCalls === 0, "Wrong return token cannot capture funds");
  const paid = await callback.GET(request(`/api/paypal/return?id=voice-bloom&token=${orderId}`, cookie));
  check(paid.headers.get("location").endsWith("checkout=success") && captureCalls === 1, "Matching approved order captures and unlocks");
  check(lastRequestId === orderId && lastRequestId.length <= 38, "Capture uses a stable idempotency key within PayPal's length limit");
  check((await sourceRequest("voice-bloom", cookie)).status === 200, "Captured payment unlocks original source");
  await callback.GET(request(`/api/paypal/return?id=voice-bloom&token=${orderId}`, cookie));
  check(captureCalls === 1, "Refreshing the return cannot charge twice");
  check((await sourceRequest("stamp-tracker", cookie)).status === 403, "Purchase unlocks only its component");
  const owned = await checkout.POST(request("/api/checkout", cookie, { id: "voice-bloom" }));
  check((await owned.json()).unlocked && orders.size === 1, "Already paid users are not charged again");
  const capture = [...captures.values()][0];
  for (const status of ["PENDING", "REFUNDED", "PARTIALLY_REFUNDED", "DECLINED"]) {
    capture.status = status;
    check((await sourceRequest("voice-bloom", cookie)).status === 403, `${status} capture cannot unlock source`);
  }
  capture.status = "COMPLETED";
  order.purchase_units[0].payee.merchant_id = "ANOTHERSELLER";
  check((await sourceRequest("voice-bloom", cookie)).status === 403, "A different merchant's order is rejected");
  order.purchase_units[0].payee.merchant_id = "MOCKMERCHANT1";
  order.purchase_units[0].amount = { currency_code: "USD", value: "0.01" };
  check((await sourceRequest("voice-bloom", cookie)).status === 403, "Wrong amount is rejected");
  order.purchase_units[0].amount = capture.amount;
  order.purchase_units[0].custom_id = "am:v1:voice-bloom:foreign-buyer:500";
  check((await sourceRequest("voice-bloom", cookie)).status === 403, "Another buyer's order is rejected");
  const foreignUrl = { ...order, links: [{ rel: "approve", href: "https://malicious.example/pay" }] };
  assert.throws(() => paypal.getPayPalApprovalUrl(foreignUrl)); checks++;
  delete process.env.PAYPAL_CLIENT_SECRET;
  check((await checkout.POST(request("/api/checkout", cookie, { id: "voice-bloom" }))).status === 503, "Missing merchant configuration keeps checkout unavailable");
  check((await sourceRequest("voice-bloom", cookie)).status === 403, "Missing configuration keeps source locked");
  console.log(`PayPal purchase checks passed (${checks}/${checks}; mocked APIs, no charges).`);
} finally { globalThis.fetch = originalFetch; }
