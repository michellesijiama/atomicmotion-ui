#!/usr/bin/env node
// Exercise the real route handlers with a mock Stripe SDK. No network,
// credentials, real charges or production unlock shortcuts are involved.
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { NextRequest } = require("next/server");
const origin = "http://localhost:3000";
const sessions = new Map();
let nextSession = 0;
let stripeFailure = false;
let lastCheckout;
let checks = 0;

class InvalidRequestError extends Error {
  statusCode = 404;
}
class MockStripe {
  static errors = { StripeInvalidRequestError: InvalidRequestError };
  checkout = { sessions: {
    async create(params) {
      if (stripeFailure) throw new Error("Stripe unavailable");
      lastCheckout = params;
      const id = `cs_test_${++nextSession}`;
      const session = {
        id, url: `https://checkout.stripe.com/test/${id}`, status: "open",
        payment_status: "unpaid", amount_total: params.line_items[0].price_data.unit_amount,
        mode: params.mode, currency: "usd", metadata: params.metadata,
        client_reference_id: params.client_reference_id,
        payment_intent: { latest_charge: { refunded: false, disputed: false } },
      };
      sessions.set(id, session);
      return session;
    },
    async retrieve(id) {
      if (stripeFailure) throw new Error("Stripe unavailable");
      if (!sessions.has(id)) throw new InvalidRequestError("Missing session");
      return sessions.get(id);
    },
  } };
}

process.env.STRIPE_SECRET_KEY = "sk_test_mock_only";
process.env.PURCHASE_COOKIE_SECRET = "local-mock-secret-at-least-thirty-two-characters";
process.env.ATOMICMOTION_APP_URL = origin;
process.env.NODE_ENV = "test";
delete process.env.PAYPAL_CLIENT_SECRET;

const moduleCache = new Map();
function load(file) {
  const filename = path.resolve(file);
  if (moduleCache.has(filename)) return moduleCache.get(filename).exports;
  const mod = { exports: {} };
  moduleCache.set(filename, mod);
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    fileName: filename,
  });
  const localRequire = (specifier) => {
    if (specifier === "server-only") return {};
    if (specifier === "stripe") return MockStripe;
    if (specifier.startsWith("@/")) {
      const resolved = `src/${specifier.slice(2)}`;
      return resolved.endsWith(".json") ? require(path.resolve(resolved)) : load(`${resolved}.ts`);
    }
    return require(specifier);
  };
  const run = vm.runInThisContext(`(function(require, module, exports) { ${outputText}\n})`, { filename });
  run(localRequire, mod, mod.exports);
  return mod.exports;
}

const purchases = load("src/lib/purchases.ts");
const offers = load("src/lib/component-offers.ts");
const registry = load("src/lib/component-registry.ts");
const checkout = load("src/app/api/checkout/route.ts");
const access = load("src/app/api/components/[id]/access/route.ts");
const source = load("src/app/api/components/[id]/source/route.ts");

function request(url, { cookie = "", body, requestOrigin = origin } = {}) {
  return new NextRequest(`${origin}${url}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { cookie, origin: requestOrigin, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
function params(id) { return { params: Promise.resolve({ id }) }; }
function cookieHeader(response) {
  return response.cookies.getAll().map(({ name, value }) => `${name}=${value}`).join("; ");
}
function check(value, message) { assert.ok(value, message); checks++; }
async function sourceStatus(id, cookie) {
  return (await source.GET(request(`/api/components/${id}/source`, { cookie }), params(id))).status;
}

check(registry.componentList.filter(({ id }) => offers.getComponentOffer(id)).length === 3, "Exactly three curated paid components");
check(registry.componentList.some(({ id }) => !offers.getComponentOffer(id)), "The gallery still includes free components");
check(!offers.getComponentOffer("__proto__"), "Inherited object keys are not offers");
check(await sourceStatus("voice-bloom", "") === 403, "Unsigned visitors cannot read paid source");
check(await sourceStatus("../LICENSE", "") === 404, "Source paths are selected from the registry");

const originalKey = process.env.STRIPE_SECRET_KEY;
delete process.env.STRIPE_SECRET_KEY;
check((await checkout.POST(request("/api/checkout", { body: { id: "voice-bloom" } }))).status === 503, "Unconfigured checkout fails closed");
check(await sourceStatus("voice-bloom", "") === 403, "Missing configuration cannot unlock source");
process.env.STRIPE_SECRET_KEY = originalKey;

check((await checkout.POST(new NextRequest(`${origin}/api/checkout`, { method: "POST", body: "not json" }))).status === 400, "Malformed requests are rejected");
check((await checkout.POST(request("/api/checkout", { body: { id: "emoji-sketch" } }))).status === 404, "Free components cannot be charged");
check((await checkout.POST(request("/api/checkout", { body: { id: "voice-bloom" }, requestOrigin: "https://untrusted.example" }))).status === 403, "Cross-origin checkout is rejected");

const purchase = await checkout.POST(request("/api/checkout", { body: { id: "voice-bloom", price: 1 } }));
check(purchase.status === 200, "Checkout creates a session");
check(lastCheckout.line_items[0].price_data.unit_amount === 500, "Submitted prices cannot override server prices");
check(lastCheckout.success_url === `${origin}/components/voice-bloom?checkout=success`, "Checkout returns to the selected live demo");
check(!("payment_method_types" in lastCheckout), "Uses the current Stripe dynamic-payment-method API");
const cookie = cookieHeader(purchase);
const receipt = purchase.cookies.get("am_purchase_voice-bloom");
const buyer = purchase.cookies.get("am_buyer");
check(receipt.httpOnly && receipt.sameSite === "lax", "Receipt is HTTP-only and same-site");
const sessionId = purchases.verifyPurchaseValue(receipt.value);
const session = sessions.get(sessionId);
check(await sourceStatus("voice-bloom", cookie) === 403, "An open or unpaid Checkout does not unlock source");
const repeated = await checkout.POST(request("/api/checkout", { cookie, body: { id: "voice-bloom" } }));
check((await repeated.json()).url === session.url && nextSession === 1, "Repeated clicks reuse an open Checkout");
check((await source.GET(request("/api/components/voice-bloom/source?checkout=success&unlocked=true", { cookie }), params("voice-bloom"))).status === 403, "URL flags cannot unlock unpaid source");

session.status = "complete";
session.payment_status = "paid";
const status = await access.GET(request("/api/components/voice-bloom/access", { cookie }), params("voice-bloom"));
check((await status.json()).unlocked === true, "Stripe-confirmed payment unlocks the matching component");
const codeResponse = await source.GET(request("/api/components/voice-bloom/source", { cookie }), params("voice-bloom"));
const bundle = await codeResponse.json();
check(codeResponse.status === 200 && bundle.source.includes("export function VoiceBloom"), "The purchased bundle contains the actual component source");
check(bundle.source === readFileSync("components/ai/voice-bloom/voice-bloom.tsx", "utf8"), "Delivered source exactly matches the authored component");
check(bundle.license.includes("MIT License") && bundle.license.includes("Copyright"), "Source bundle includes the original license");
check(bundle.setup.includes("framer-motion lucide-react") && bundle.usage.includes("<VoiceBloom />"), "Bundle includes setup and executable usage");
check(codeResponse.headers.get("cache-control") === "private, no-store", "Source is never publicly cached");
const download = await source.GET(request("/api/components/voice-bloom/source?download=1", { cookie }), params("voice-bloom"));
check(download.headers.get("content-disposition") === 'attachment; filename="voice-bloom.tsx"' && (await download.text()).includes("MIT License"), "Download delivers licensed TSX");
check(await sourceStatus("voice-bloom", cookie) === 200, "A new request retains verified purchased access");
const owned = await checkout.POST(request("/api/checkout", { cookie, body: { id: "voice-bloom" } }));
check((await owned.json()).unlocked === true && nextSession === 1, "Purchased components cannot accidentally be purchased again");
check(await sourceStatus("stamp-tracker", cookie) === 403, "Buying one component does not unlock another");

const forged = cookie.replace(receipt.value, `${receipt.value.slice(0, -2)}xx`);
check(await sourceStatus("voice-bloom", forged) === 403, "Tampered receipts are rejected");
const foreignBuyer = cookie.replace(buyer.value, purchases.signPurchaseValue("another-browser"));
check(await sourceStatus("voice-bloom", foreignBuyer) === 403, "Receipts cannot be replayed for a different browser buyer");
const expiredPayload = Buffer.from(JSON.stringify({ value: sessionId, expires: Date.now() - 1000 })).toString("base64url");
const expiredSignature = createHmac("sha256", process.env.PURCHASE_COOKIE_SECRET).update(expiredPayload).digest("base64url");
check(!purchases.verifyPurchaseValue(`${expiredPayload}.${expiredSignature}`), "Expired signed receipts are rejected");

session.amount_total = 1;
check(await sourceStatus("voice-bloom", cookie) === 403, "Incorrect payment amounts are rejected");
session.amount_total = 500;
session.currency = "eur";
check(await sourceStatus("voice-bloom", cookie) === 403, "Incorrect payment currencies are rejected");
session.currency = "usd";
session.payment_intent.latest_charge.refunded = true;
check(await sourceStatus("voice-bloom", cookie) === 403, "Fully refunded purchases lose source access");
session.payment_intent.latest_charge.refunded = false;
session.payment_intent.latest_charge.disputed = true;
check(await sourceStatus("voice-bloom", cookie) === 403, "Disputed purchases lose source access");
session.payment_intent.latest_charge.disputed = false;
stripeFailure = true;
check(await sourceStatus("voice-bloom", cookie) === 502, "Stripe failures do not accidentally grant source access");
stripeFailure = false;
const free = await access.GET(request("/api/components/emoji-sketch/access"), params("emoji-sketch"));
check((await free.json()).unlocked === true, "Free components remain unlocked");

for (const id of ["gradient-event-card", "stamp-tracker"]) {
  const response = await checkout.POST(request("/api/checkout", { body: { id } }));
  const componentCookie = cookieHeader(response);
  const createdSession = sessions.get(purchases.verifyPurchaseValue(response.cookies.get(`am_purchase_${id}`).value));
  createdSession.status = "complete";
  createdSession.payment_status = "paid";
  check(await sourceStatus(id, componentCookie) === 200, `${id} can be purchased and delivered`);
}

console.log(`verify-component-purchases: OK (${checks} checks; mocked Stripe, no real charges)`);
