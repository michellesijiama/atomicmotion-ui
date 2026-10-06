import { NextRequest, NextResponse } from "next/server";
import { getComponentById } from "@/lib/component-registry";
import { getComponentOffer } from "@/lib/component-offers";
import { hasComponentPurchase, paymentsConfigured } from "@/lib/purchases";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getComponentById(id)) return NextResponse.json({ error: "Component not found." }, { status: 404 });
  try {
    const unlocked = !getComponentOffer(id) || await hasComponentPurchase(request, id);
    return NextResponse.json({ unlocked, checkoutAvailable: paymentsConfigured() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "We couldn't check your purchase. Please try again." }, { status: 502, headers: { "Cache-Control": "private, no-store" } });
  }
}
