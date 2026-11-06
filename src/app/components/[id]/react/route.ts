import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { getComponentById } from "@/lib/component-registry";
import { hasSwiftUI, swiftUIComponents } from "@/lib/swiftui-components";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(swiftUIComponents).map((id) => ({ id }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const component = hasSwiftUI(id) ? getComponentById(id) : undefined;
  if (!component) return new Response("Not found", { status: 404 });

  const relativePath = component.codePath.slice("components/".length);
  const source = await readFile(join(process.cwd(), "components", relativePath), "utf8");
  return new Response(source, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${basename(component.codePath)}"`,
    },
  });
}
