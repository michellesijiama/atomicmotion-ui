import { NextRequest, NextResponse } from "next/server";
import { getComponentById } from "@/lib/component-registry";
import { getComponentOffer } from "@/lib/component-offers";
import { hasComponentPurchase } from "@/lib/purchases";
import bundledSources from "@/lib/component-sources.generated.json";

// Build-time source packaging avoids filesystem access and overbroad
// serverless file tracing. This module is only imported by a server route.
const sources: Record<string, string> = bundledSources.sources;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const component = getComponentById(id);
  const offer = getComponentOffer(id);
  const source = Object.hasOwn(sources, id) ? sources[id] : undefined;
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  if (!component || !offer || !source) return NextResponse.json({ error: "Source not found." }, { status: 404, headers });
  try {
    if (!await hasComponentPurchase(request, id)) return NextResponse.json({ error: "Purchase this component to unlock its source code." }, { status: 403, headers });
    const license = bundledSources.license;
    const filename = `${id}.tsx`;
    const usage = `import { ${offer.exportName} } from "./${id}";\n\nexport default function Example() {\n  return <${offer.exportName} />;\n}`;
    const setup = [
      "Requires React, TypeScript and Tailwind CSS v4.",
      "", `npm install ${offer.dependencies.join(" ")}`, "",
      `Save ${filename} in your components folder.`,
      "Animation logic and styling are included in the component.",
      "Next.js: import it from a page or another component. The source includes its client directive.",
      "", "Personal and commercial use under the included MIT license.",
    ].join("\n");
    const prompt = `Use AtomicMotion UI's ${component.title} component in my project.\n${setup}\n\nUsage:\n${usage}\n\nSource (${filename}):\n\`\`\`tsx\n${source}\n\`\`\`\n\nPreserve the MIT license:\n${license}`;
    if (request.nextUrl.searchParams.get("download") === "1") {
      return new NextResponse(`/*\n${license}\n*/\n\n${source}`, { headers: { ...headers, "Content-Type": "text/plain; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"` } });
    }
    return NextResponse.json({ source, setup, usage, license, prompt, filename }, { headers });
  } catch {
    return NextResponse.json({ error: "We couldn't load your source code. Please try again." }, { status: 502, headers });
  }
}
