import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { hasSwiftUI, swiftUIComponents } from "@/lib/swiftui-components";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(swiftUIComponents).map((id) => ({ id }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!hasSwiftUI(id)) return new Response("Not found", { status: 404 });

  const file = swiftUIComponents[id].sourceFile;
  const source = await readFile(join(process.cwd(), "swiftui/Sources/AtomicMotionUI", file), "utf8");
  return new Response(source, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
