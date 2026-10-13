import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { catalog, findModel } from "@/catalog";
import { modelUrl } from "@/catalog/schema";
import { ArLauncher } from "@/components/ArLauncher";
import { ModelPreview } from "@/components/ModelPreview";
import { formatLength } from "@/lib/units";

export function generateStaticParams() {
  return catalog.models.map((model) => ({ id: model.id }));
}

export async function generateMetadata({ params }: PageProps<"/models/[id]">): Promise<Metadata> {
  const model = findModel((await params).id);
  return model ? { title: model.name, description: model.summary } : {};
}

const AXES = [
  ["Width", "width"],
  ["Height", "height"],
  ["Depth", "depth"],
] as const;

export default async function ModelPage({ params }: PageProps<"/models/[id]">) {
  const model = findModel((await params).id);
  if (!model) notFound();
  const src = modelUrl(model);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 sm:px-8 sm:py-10">
      <Link href="/" className="w-fit text-sm text-ink/60 hover:text-ink">
        ← All objects
      </Link>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="aspect-square overflow-hidden rounded-3xl bg-tile lg:aspect-auto lg:min-h-[560px]">
          <ModelPreview src={src} alt={`3D preview of the ${model.name.toLowerCase()}`} />
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="font-mono text-xs tracking-widest text-ink/55 uppercase">
              Sits on {model.placement === "floor" ? "the floor" : "a table"}
            </p>
            <h1 className="font-display text-4xl font-semibold tracking-tight">{model.name}</h1>
            <p className="text-ink/70">{model.summary}</p>
          </div>

          <table className="w-full text-left font-mono text-sm">
            <caption className="sr-only">Real-world size</caption>
            <tbody>
              {AXES.map(([label, axis]) => (
                <tr key={axis} className="border-b border-ink/10">
                  <th scope="row" className="py-2 font-sans font-normal text-ink/60">{label}</th>
                  <td className="py-2">{formatLength(model.dimensionsM[axis], "metric")}</td>
                  <td className="py-2 text-right text-ink/60">{formatLength(model.dimensionsM[axis], "imperial")}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <ArLauncher name={model.name} src={src} />

          <p className="text-xs text-ink/55">
            “{model.credit.title}” by {model.credit.authors.join(", ")}, {model.credit.license}.
            {model.source.kind === "khronos" &&
              (model.source.keepNodes ? " Rescaled to real size, extra scene props removed." : " Rescaled to real size.")}{" "}
            <a href={model.credit.url} className="underline" target="_blank" rel="noreferrer">
              Source
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
