import raw from "./models.json";
import { parseCatalog, type ModelEntry } from "./schema";

export const catalog = parseCatalog(raw);

export function findModel(id: string): ModelEntry | undefined {
  return catalog.models.find((model) => model.id === id);
}
