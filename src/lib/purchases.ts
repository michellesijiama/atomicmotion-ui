import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import Stripe from "stripe";
import type { NextRequest, NextResponse } from "next/server";
import { getPayPalOrder, isPaidPayPalOrder, paypalConfigured } from "@/lib/paypal";

const YEAR = 60 * 60 * 24 * 365;
const BUYER_COOKIE = "am_buyer";
const RECEIPT_PREFIX = "am_purchase_";

type SignedValue = { value: string; expires: number };

export function paymentsConfigured() {
  return Boolean(
    (process.env.STRIPE_SECRET_KEY || paypalConfigured()) &&
    (process.env.PURCHASE_COOKIE_SECRET?.length ?? 0) >= 32 &&
    (process.env.NODE_ENV !== "production" || process.env.ATOMICMOTION_APP_URL),
  );
}

function cookieSecret() {
  const secret = process.env.PURCHASE_COOKIE_SECRET;
  if (!secret || secret.length < 32) throw new Error("Purchase cookie secret is not configured");
  return secret;
}

export function signPurchaseValue(value: string) {
  const payload = Buffer.from(JSON.stringify({ value, expires: Date.now() + YEAR * 1000 })).toString("base64url");
  const signature = createHmac("sha256", cookieSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyPurchaseValue(token: string | undefined): string | undefined {
  if (!token || !paymentsConfigured()) return undefined;
  try {
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra) return undefined;
    const expected = createHmac("sha256", cookieSecret()).update(payload).digest();
    const received = Buffer.from(signature, "base64url");
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return undefined;
    const parsed: SignedValue = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof parsed.value === "string" && parsed.expires > Date.now() ? parsed.value : undefined;
  } catch {
    return undefined;
  }
}

export function getBuyer(request: NextRequest) {
  return verifyPurchaseValue(request.cookies.get(BUYER_COOKIE)?.value);
}

export function createBuyer() {
  return randomUUID();
}

export function setPurchaseCookies(response: NextResponse, id: string, buyer: string, sessionId: string) {
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: YEAR,
  };
  response.cookies.set(BUYER_COOKIE, signPurchaseValue(buyer), options);
  response.cookies.set(`${RECEIPT_PREFIX}${id}`, signPurchaseValue(sessionId), options);
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured");
  return new Stripe(key, { timeout: 10000, maxNetworkRetries: 1 });
}

export function getAppOrigin(request: NextRequest) {
  const origin = new URL(process.env.ATOMICMOTION_APP_URL ?? request.url).origin;
  if (process.env.NODE_ENV === "production" && !origin.startsWith("https://")) {
    throw new Error("Production checkout requires an HTTPS app URL");
  }
  return origin;
}

export function isPaidComponentSession(session: Stripe.Checkout.Session, id: string, buyer: string) {
  const recordedPrice = Number(session.metadata?.price_in_cents);
  const intent = typeof session.payment_intent === "object" ? session.payment_intent : null;
  const charge = typeof intent?.latest_charge === "object" ? intent.latest_charge : null;
  return session.mode === "payment" &&
    session.status === "complete" && session.payment_status === "paid" &&
    session.currency === "usd" &&
    session.client_reference_id === buyer &&
    session.metadata?.component_id === id &&
    session.metadata?.purchase_version === "1" &&
    Number.isSafeInteger(recordedPrice) && recordedPrice > 0 &&
    session.amount_total === recordedPrice &&
    !charge?.refunded && !charge?.disputed;
}

export async function getPurchaseSession(request: NextRequest, id: string) {
  const buyer = getBuyer(request);
  const sessionId = verifyPurchaseValue(request.cookies.get(`${RECEIPT_PREFIX}${id}`)?.value);
  if (!buyer || !sessionId || !/^cs_(test_|live_)?[a-zA-Z0-9]+$/.test(sessionId)) return null;
  let session: Stripe.Checkout.Session;
  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent.latest_charge"],
    });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeInvalidRequestError && error.statusCode === 404) return null;
    throw error;
  }
  if (session.client_reference_id !== buyer || session.metadata?.component_id !== id || session.metadata?.purchase_version !== "1") return null;
  return session;
}

export async function hasComponentPurchase(request: NextRequest, id: string) {
  if (!paymentsConfigured()) return false;
  const buyer = getBuyer(request);
  if (!buyer) return false;
  const paypalOrderId = getPayPalReceipt(request, id);
  if (paypalOrderId && paypalConfigured()) {
    return isPaidPayPalOrder(await getPayPalOrder(paypalOrderId), id, buyer);
  }
  if (!process.env.STRIPE_SECRET_KEY) return false;
  const session = await getPurchaseSession(request, id);
  return session ? isPaidComponentSession(session, id, buyer) : false;
}

export function getPayPalReceipt(request: NextRequest, id: string) {
  const receipt = verifyPurchaseValue(request.cookies.get(`${RECEIPT_PREFIX}${id}`)?.value);
  return receipt && /^pp:[A-Z0-9]{10,36}$/.test(receipt) ? receipt.slice(3) : undefined;
}

// Each browser keeps a signed Checkout receipt. Rechecking it with Stripe on
// access also reconciles payments when the customer missed the return page.
// Client state, query parameters and unsigned cookies never grant access.
