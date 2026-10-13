import { z } from "zod";

const metres = z.number().positive().max(5);

const khronosSource = z.object({
  kind: z.literal("khronos"),
  path: z.string().regex(/^Models\/[\w-]+\/glTF-Binary\/[\w-]+\.glb$/),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  /** Top-level nodes to keep; the rest of the sample (props, lights, animation) is dropped. */
  keepNodes: z.array(z.string().min(1)).min(1).optional(),
});

const generatedSource = z.object({
  kind: z.literal("generated"),
  generator: z.string().min(1),
});

export const modelEntrySchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id must be kebab-case"),
  name: z.string().min(1),
  summary: z.string().min(1).max(160),
  placement: z.enum(["floor", "table"]),
  dimensionsM: z.object({ width: metres, height: metres, depth: metres }),
  source: z.discriminatedUnion("kind", [khronosSource, generatedSource]),
  credit: z.object({
    title: z.string().min(1),
    authors: z.array(z.string().min(1)).min(1),
    license: z.enum(["CC0-1.0", "CC-BY-4.0", "MIT"]),
    url: z.url(),
  }),
});

export const catalogSchema = z
  .object({ models: z.array(modelEntrySchema).min(1) })
  .refine((catalog) => new Set(catalog.models.map((m) => m.id)).size === catalog.models.length, {
    message: "model ids must be unique",
  });

export type ModelEntry = z.infer<typeof modelEntrySchema>;
export type Catalog = z.infer<typeof catalogSchema>;

/** Parses untrusted catalog JSON. Throws a readable error listing every problem. */
export function parseCatalog(input: unknown): Catalog {
  const result = catalogSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`Invalid model catalog:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export function modelUrl(model: Pick<ModelEntry, "id">): string {
  return `/models/${model.id}.glb`;
}
