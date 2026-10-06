import { NextRequest, NextResponse } from "next/server";
import { getComponentById } from "@/lib/component-registry";
import { getComponentOffer } from "@/lib/component-offers";
import { createBuyer, getAppOrigin, getBuyer, getPayPalReceipt, getPurchaseSession, getStripe, isPaidComponentSession, paymentsConfigured, setPurchaseCookies } from "@/lib/purchases";
import { createPayPalOrder, getPayPalApprovalUrl, getPayPalOrder, isPaidPayPalOrder, matchesPayPalOrder, paypalConfigured } from "@/lib/paypal";

export async function POST(request: NextRequest) {
  let id: unknown;
  try {
    ({ id } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const component = typeof id === "string" ? getComponentById(id) : undefined;
  const offer = component ? getComponentOffer(component.id) : undefined;
  if (!component || !offer) return NextResponse.json({ error: "This component is not available for purchase." }, { status: 404 });
  if (!paymentsConfigured()) return NextResponse.json({ error: "Purchases aren't available yet. Please check back soon." }, { status: 503 });

  try {
    const origin = getAppOrigin(request);
    if (request.headers.get("origin") !== origin) return NextResponse.json({ error: "Invalid checkout origin." }, { status: 403 });
    const buyer = getBuyer(request) ?? createBuyer();
    if (paypalConfigured()) {
      const previousId = getPayPalReceipt(request, component.id);
      if (previousId) {
        const previous = await getPayPalOrder(previousId);
        if (!matchesPayPalOrder(previous, component.id, buyer)) throw new Error("Invalid PayPal receipt");
        if (await isPaidPayPalOrder(previous, component.id, buyer)) return NextResponse.json({ unlocked: true });
        if (previous.status === "APPROVED") return NextResponse.json({ url: `${origin}/api/paypal/return?id=${component.id}&token=${previous.id}` });
        const pendingUrl = getPayPalApprovalUrl(previous);
        if (previous.status === "CREATED" && pendingUrl && previous.purchase_units?.[0].amount?.value === (offer.priceInCents / 100).toFixed(2)) return NextResponse.json({ url: pendingUrl });
      }
      const order = await createPayPalOrder(component.id, component.title, offer.priceInCents, buyer, origin);
      const url = getPayPalApprovalUrl(order);
      if (!url) throw new Error("PayPal did not return a checkout URL");
      const response = NextResponse.json({ url });
      setPurchaseCookies(response, component.id, buyer, `pp:${order.id}`);
      return response;
    }
    const previous = await getPurchaseSession(request, component.id);
    if (previous && isPaidComponentSession(previous, component.id, buyer)) return NextResponse.json({ unlocked: true });
    if (previous?.status === "open" && previous.url && previous.amount_total === offer.priceInCents) {
      return NextResponse.json({ url: previous.url });
    }
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      // Payment methods are managed in Stripe's Dashboard on current APIs.
      payment_method_configuration: process.env.STRIPE_PAYMENT_METHOD_CONFIGURATION_ID,
      client_reference_id: buyer,
      metadata: { component_id: component.id, purchase_version: "1", price_in_cents: String(offer.priceInCents) },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: offer.priceInCents,
          product_data: { name: `${component.title} — source code`, description: "React + TypeScript component, animation logic and usage guide. MIT license included." },
        },
      }],
      success_url: `${origin}/components/${component.id}?checkout=success`,
      cancel_url: `${origin}/components/${component.id}?checkout=cancelled`,
    }, { idempotencyKey: `am-${component.id}-${buyer}-${randomCheckoutAttempt()}` });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    const response = NextResponse.json({ url: session.url });
    setPurchaseCookies(response, component.id, buyer, session.id);
    return response;
  } catch {
    return NextResponse.json({ error: "Checkout is temporarily unavailable. Please try again." }, { status: 502 });
  }
}

function randomCheckoutAttempt() {
  return crypto.randomUUID();
}
