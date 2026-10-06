import "server-only";

type Money = { currency_code?: string; value?: string };
type Capture = { id?: string; status?: string; amount?: Money; final_capture?: boolean };
export type PayPalOrder = {
  id: string;
  status: string;
  intent?: string;
  purchase_units?: Array<{
    reference_id?: string;
    custom_id?: string;
    amount?: Money;
    payee?: { merchant_id?: string };
    payments?: { captures?: Capture[] };
  }>;
  links?: Array<{ rel: string; href: string }>;
};

export function paypalConfigured() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET && process.env.PAYPAL_MERCHANT_ID &&
    (process.env.PAYPAL_ENVIRONMENT === "live" || process.env.PAYPAL_ENVIRONMENT === "sandbox"));
}

const apiOrigin = () => process.env.PAYPAL_ENVIRONMENT === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

async function paypalRequest<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
  if (!paypalConfigured()) throw new Error("PayPal is not configured");
  const auth = await fetch(`${apiOrigin()}/v1/oauth2/token`, {
    method: "POST", cache: "no-store", signal: AbortSignal.timeout(10000),
    headers: { Authorization: `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!auth.ok) throw new Error("PayPal authentication failed");
  const token = await auth.json();
  if (typeof token.access_token !== "string" || !token.access_token) throw new Error("Invalid PayPal access token");
  const response = await fetch(`${apiOrigin()}${endpoint}`, {
    ...init, cache: "no-store", signal: AbortSignal.timeout(10000),
    headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json", ...init.headers },
  });
  if (!response.ok) throw new Error("PayPal request failed");
  return response.json();
}

export function paypalCustomId(id: string, buyer: string, price: number) {
  return `am:v1:${id}:${buyer}:${price}`;
}

export function matchesPayPalOrder(order: PayPalOrder, id: string, buyer: string) {
  const units = order.purchase_units ?? [];
  if (order.intent !== "CAPTURE" || units.length !== 1) return false;
  const unit = units[0];
  const [brand, version, component, owner, rawPrice, extra] = (unit.custom_id ?? "").split(":");
  const price = Number(rawPrice);
  return brand === "am" && version === "v1" && component === id && owner === buyer && extra === undefined &&
    unit.reference_id === id && unit.payee?.merchant_id === process.env.PAYPAL_MERCHANT_ID &&
    /^\d+$/.test(rawPrice ?? "") && Number.isSafeInteger(price) && price > 0 &&
    unit.amount?.currency_code === "USD" && unit.amount.value === (price / 100).toFixed(2);
}

export async function isPaidPayPalOrder(order: PayPalOrder, id: string, buyer: string) {
  if (order.status !== "COMPLETED" || !matchesPayPalOrder(order, id, buyer)) return false;
  const unit = order.purchase_units![0];
  const captures = unit.payments?.captures ?? [];
  if (captures.length !== 1 || !captures[0].id) return false;
  // Read the current capture, because an order may stay COMPLETED after a refund.
  const capture = await paypalRequest<Capture>(`/v2/payments/captures/${encodeURIComponent(captures[0].id)}`);
  return capture.status === "COMPLETED" && capture.final_capture === true &&
    capture.amount?.currency_code === "USD" && capture.amount.value === unit.amount!.value;
}

export function getPayPalApprovalUrl(order: PayPalOrder) {
  const url = order.links?.find(({ rel }) => rel === "payer-action" || rel === "approve")?.href;
  if (!url) return undefined;
  const parsed = new URL(url);
  const hosts = process.env.PAYPAL_ENVIRONMENT === "live" ? ["www.paypal.com", "paypal.com"] : ["www.sandbox.paypal.com", "sandbox.paypal.com"];
  if (parsed.protocol !== "https:" || !hosts.includes(parsed.hostname) || parsed.username || parsed.password) throw new Error("Invalid PayPal checkout URL");
  return url;
}

export function getPayPalOrder(orderId: string) {
  if (!/^[A-Z0-9]{10,36}$/.test(orderId)) throw new Error("Invalid PayPal order ID");
  return paypalRequest<PayPalOrder>(`/v2/checkout/orders/${orderId}`);
}

export async function createPayPalOrder(id: string, title: string, price: number, buyer: string, origin: string) {
  const order = await paypalRequest<PayPalOrder>("/v2/checkout/orders", {
    method: "POST", headers: { "PayPal-Request-Id": crypto.randomUUID(), Prefer: "return=representation" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{ reference_id: id, custom_id: paypalCustomId(id, buyer, price),
        description: `${title} — React + TypeScript source code`,
        payee: { merchant_id: process.env.PAYPAL_MERCHANT_ID },
        amount: { currency_code: "USD", value: (price / 100).toFixed(2) } }],
      payment_source: { paypal: { experience_context: {
        brand_name: "AtomicMotion", shipping_preference: "NO_SHIPPING", user_action: "PAY_NOW",
        return_url: `${origin}/api/paypal/return?id=${encodeURIComponent(id)}`,
        cancel_url: `${origin}/components/${id}?checkout=cancelled`,
      } } },
    }),
  });
  if (!/^[A-Z0-9]{10,36}$/.test(order.id)) throw new Error("Invalid PayPal order response");
  return order;
}

export async function capturePayPalOrder(orderId: string) {
  if (!/^[A-Z0-9]{10,36}$/.test(orderId)) throw new Error("Invalid PayPal order ID");
  try {
    await paypalRequest<PayPalOrder>(`/v2/checkout/orders/${orderId}/capture`, {
      method: "POST", headers: { "PayPal-Request-Id": orderId, Prefer: "return=representation" }, body: "{}",
    });
  } catch {
    // A timed-out or repeated capture may already have succeeded. Never create
    // another charge: retrieve the same order and validate the paid capture.
  }
  return getPayPalOrder(orderId);
}
