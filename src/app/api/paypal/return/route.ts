import { NextRequest, NextResponse } from "next/server";
import { getComponentById } from "@/lib/component-registry";
import { getComponentOffer } from "@/lib/component-offers";
import { getAppOrigin, getBuyer, getPayPalReceipt, paymentsConfigured } from "@/lib/purchases";
import { capturePayPalOrder, getPayPalOrder, isPaidPayPalOrder, matchesPayPalOrder, paypalConfigured } from "@/lib/paypal";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  const component = getComponentById(id);
  if (!component || !getComponentOffer(id)) return NextResponse.json({ error: "Component not found." }, { status: 404 });
  if (!paymentsConfigured() || !paypalConfigured()) return NextResponse.json({ error: "PayPal isn't available yet." }, { status: 503 });
  const origin = getAppOrigin(request);
  let paid = false;
  try {
    const buyer = getBuyer(request);
    const orderId = getPayPalReceipt(request, id);
    if (buyer && orderId && orderId === request.nextUrl.searchParams.get("token")) {
      let order = await getPayPalOrder(orderId);
      if (matchesPayPalOrder(order, id, buyer)) {
        if (order.status === "APPROVED") order = await capturePayPalOrder(orderId);
        paid = await isPaidPayPalOrder(order, id, buyer);
      }
    }
  } catch { /* Keep source locked when PayPal cannot confirm the captured payment. */ }
  return NextResponse.redirect(`${origin}/components/${id}?checkout=${paid ? "success" : "failed"}`, { status: 303, headers: { "Cache-Control": "private, no-store" } });
}
