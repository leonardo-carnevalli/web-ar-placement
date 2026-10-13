/**
 * Prepares every model in the catalog under public/models:
 *  - Khronos samples are downloaded from a pinned commit, checked against their
 *    SHA-256 and rescaled so they are real size (metres, feet on y = 0, centred).
 *  - Generated models are built from code.
 * Each result is measured and compared with the dimensions the catalog shows.
 *
 * Usage: npm run models
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getBounds, NodeIO, type Document } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { prune } from "@gltf-transform/functions";
import { catalog } from "../src/catalog";
import type { ModelEntry } from "../src/catalog/schema";
import { buildRobot } from "./robot";

const KHRONOS_COMMIT = "edc7c9e67c639d230715049ee31f9a96a6babbbe";
const KHRONOS_RAW = `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/${KHRONOS_COMMIT}`;
const CACHE_DIR = path.resolve(".cache/models");
const OUT_DIR = path.resolve("public/models");
const TOLERANCE_M = 0.01;

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

async function download(model: ModelEntry & { source: { kind: "khronos" } }): Promise<Uint8Array> {
  const cached = path.join(CACHE_DIR, `${model.id}.glb`);
  const bytes = await readFile(cached).catch(async () => {
    const response = await fetch(`${KHRONOS_RAW}/${model.source.path}`);
    if (!response.ok) throw new Error(`${model.id}: HTTP ${response.status}`);
    const fetched = new Uint8Array(await response.arrayBuffer());
    await writeFile(cached, fetched);
    return fetched;
  });
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== model.source.sha256) {
    throw new Error(`${model.id}: checksum mismatch (got ${digest}). Delete ${cached} and retry.`);
  }
  return bytes;
}

/** Drops everything except the named top-level nodes, plus animations and lights that go with them. */
async function keepOnly(doc: Document, names: string[]): Promise<void> {
  const scene = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0];
  for (const node of scene.listChildren()) {
    if (!names.includes(node.getName())) node.dispose();
  }
  for (const animation of doc.getRoot().listAnimations()) animation.dispose();
  for (const extension of doc.getRoot().listExtensionsUsed()) {
    if (extension.extensionName === "KHR_lights_punctual") extension.dispose();
  }
  await doc.transform(prune());
}

/** Wraps the scene in one node that scales it to the catalog height and puts it on the ground. */
function toRealSize(doc: Document, heightM: number): void {
  const scene = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0];
  const { min, max } = getBounds(scene);
  const scale = heightM / (max[1] - min[1]);
  const centre = [(min[0] + max[0]) / 2, min[1], (min[2] + max[2]) / 2];
  const root = doc
    .createNode("real-size")
    .setScale([scale, scale, scale])
    .setTranslation([-centre[0] * scale, -centre[1] * scale, -centre[2] * scale]);
  for (const child of scene.listChildren()) {
    scene.removeChild(child);
    root.addChild(child);
  }
  scene.addChild(root);
}

function measure(doc: Document) {
  const scene = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0];
  const { min, max } = getBounds(scene);
  return { width: max[0] - min[0], height: max[1] - min[1], depth: max[2] - min[2] };
}

async function prepare(model: ModelEntry): Promise<string> {
  let doc: Document;
  if (model.source.kind === "khronos") {
    doc = await io.readBinary(await download({ ...model, source: model.source }));
    if (model.source.keepNodes) await keepOnly(doc, model.source.keepNodes);
    toRealSize(doc, model.dimensionsM.height);
  } else {
    doc = buildRobot();
  }

  const measured = measure(doc);
  const off = (["width", "height", "depth"] as const).filter(
    (axis) => Math.abs(measured[axis] - model.dimensionsM[axis]) > TOLERANCE_M,
  );
  if (off.length > 0) {
    const actual = Object.entries(measured).map(([k, v]) => `${k} ${v.toFixed(3)}`).join(", ");
    throw new Error(`${model.id}: catalog dimensions are off on ${off.join(", ")} (measured ${actual} m)`);
  }

  const bytes = await io.writeBinary(doc);
  await writeFile(path.join(OUT_DIR, `${model.id}.glb`), bytes);
  return `${model.id}: ${(bytes.byteLength / 1e6).toFixed(1)} MB`;
}

await mkdir(CACHE_DIR, { recursive: true });
await mkdir(OUT_DIR, { recursive: true });
const results = await Promise.allSettled(catalog.models.map(prepare));
for (const result of results) {
  console.log(result.status === "fulfilled" ? `ok  ${result.value}` : `ERR ${result.reason.message}`);
}
if (results.some((r) => r.status === "rejected")) process.exit(1);
