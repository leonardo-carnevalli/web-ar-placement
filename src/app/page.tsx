import Image from "next/image";
import Link from "next/link";
import { catalog } from "@/catalog";
import { DeviceBadge } from "@/components/DeviceBadge";
import { formatDimensions } from "@/lib/units";

export default function CatalogPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-10 sm:px-8 sm:py-16">
      <header className="flex flex-col gap-5">
        <p className="font-mono text-xs tracking-widest text-ink/55 uppercase">WebXR · AR Quick Look · Scene Viewer</p>
        <h1 className="max-w-3xl font-display text-4xl leading-[1.05] font-semibold tracking-tight sm:text-6xl">
          Put a 3D object on your table, from a web page.
        </h1>
        <p className="max-w-2xl text-lg text-ink/70">
          Pick an object and open it in your space. It shows up at real size through the phone camera, sitting on the
          floor or a table, ready to move, turn, resize and photograph. No app to install.
        </p>
        <DeviceBadge />
      </header>

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {catalog.models.map((model) => (
          <li key={model.id}>
            <Link
              href={`/models/${model.id}`}
              className="group flex h-full flex-col overflow-hidden rounded-3xl border border-ink/10 bg-card transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="relative aspect-square bg-tile">
                <Image
                  src={`/posters/${model.id}.webp`}
                  alt={`${model.name}, rendered`}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="object-contain p-6 transition group-hover:scale-[1.03]"
                />
                <span className="absolute top-3 left-3 rounded-full bg-card/90 px-3 py-1 text-xs font-medium">
                  {model.placement === "floor" ? "Floor" : "Table"}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-5">
                <h2 className="font-display text-xl font-semibold">{model.name}</h2>
                <p className="font-mono text-sm text-ink/60">{formatDimensions(model.dimensionsM, "metric")}</p>
                <p className="text-sm text-ink/70">{model.summary}</p>
                <span className="mt-auto pt-3 font-semibold text-accent">View in your space →</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <footer className="flex flex-col gap-1 border-t border-ink/10 pt-6 text-sm text-ink/60 sm:flex-row sm:justify-between">
        <span>Built by Leonardo Carnevalli with Next.js, three.js and model-viewer.</span>
        <span>Models from the Khronos glTF Sample Assets, credited on each page.</span>
      </footer>
    </main>
  );
}
