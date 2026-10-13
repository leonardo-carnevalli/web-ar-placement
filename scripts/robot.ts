import { Document, type Material, type Node } from "@gltf-transform/core";
import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  SphereGeometry,
} from "three";

type Vec3 = [number, number, number];

/**
 * Builds the toy robot from primitives. Units are metres, the feet rest on y = 0
 * and the robot faces +z, so it needs no normalisation step.
 */
export function buildRobot(): Document {
  const doc = new Document();
  doc.createBuffer();
  const scene = doc.createScene("toy-robot");
  const root = doc.createNode("toy-robot");
  scene.addChild(root);

  const paint = (name: string, color: Vec3, roughness: number, metallic = 0, glow?: Vec3) => {
    const material = doc
      .createMaterial(name)
      .setBaseColorFactor([...color, 1])
      .setRoughnessFactor(roughness)
      .setMetallicFactor(metallic);
    return glow ? material.setEmissiveFactor(glow) : material;
  };

  const shell = paint("shell", [0.93, 0.92, 0.88], 0.45);
  const accent = paint("accent", [0.96, 0.42, 0.18], 0.4);
  const joint = paint("joint", [0.22, 0.24, 0.27], 0.35, 0.8);
  const eye = paint("eye", [0.15, 0.95, 0.85], 0.2, 0, [0.1, 0.9, 0.8]);

  const part = (name: string, geometry: BufferGeometry, material: Material, at: Vec3): Node => {
    const node = doc.createNode(name).setMesh(toMesh(doc, name, geometry, material)).setTranslation(at);
    root.addChild(node);
    return node;
  };

  // Legs and feet
  for (const side of [-1, 1]) {
    const x = side * 0.035;
    part(`foot-${side}`, new BoxGeometry(0.05, 0.02, 0.07), joint, [x, 0.01, 0.01]);
    part(`leg-${side}`, new CylinderGeometry(0.015, 0.015, 0.06, 20), joint, [x, 0.05, 0]);
  }

  // Body
  part("torso", new BoxGeometry(0.14, 0.1, 0.09), shell, [0, 0.13, 0]);
  part("chest-light", new BoxGeometry(0.05, 0.03, 0.005), accent, [0, 0.14, 0.0475]);

  // Arms, slightly raised for a friendlier pose
  for (const side of [-1, 1]) {
    part(`shoulder-${side}`, new SphereGeometry(0.018, 20, 12), joint, [side * 0.085, 0.165, 0]);
    part(`arm-${side}`, new CylinderGeometry(0.013, 0.013, 0.08, 16), shell, [side * 0.09, 0.12, 0]);
    part(`hand-${side}`, new SphereGeometry(0.017, 20, 12), accent, [side * 0.09, 0.075, 0]);
  }

  // Head
  part("neck", new CylinderGeometry(0.015, 0.015, 0.02, 16), joint, [0, 0.19, 0]);
  part("head", new BoxGeometry(0.11, 0.07, 0.08), shell, [0, 0.235, 0]);
  for (const side of [-1, 1]) {
    part(`eye-${side}`, new SphereGeometry(0.011, 20, 12), eye, [side * 0.025, 0.24, 0.038]);
  }
  part("antenna", new CylinderGeometry(0.003, 0.003, 0.04, 8), joint, [0, 0.29, 0]);
  part("antenna-tip", new SphereGeometry(0.01, 16, 10), accent, [0, 0.31, 0]);

  return doc;
}

function toMesh(doc: Document, name: string, geometry: BufferGeometry, material: Material) {
  const buffer = doc.getRoot().listBuffers()[0];
  const accessor = (type: "VEC3" | "VEC2" | "SCALAR", array: Float32Array<ArrayBuffer> | Uint16Array<ArrayBuffer>) =>
    doc.createAccessor().setType(type).setArray(array).setBuffer(buffer);

  const attributes = geometry.attributes;
  const index = geometry.getIndex();
  if (!index) throw new Error(`${name}: expected indexed geometry`);

  const primitive = doc
    .createPrimitive()
    .setAttribute("POSITION", accessor("VEC3", new Float32Array(attributes.position.array)))
    .setAttribute("NORMAL", accessor("VEC3", new Float32Array(attributes.normal.array)))
    .setAttribute("TEXCOORD_0", accessor("VEC2", new Float32Array(attributes.uv.array)))
    .setIndices(accessor("SCALAR", new Uint16Array(index.array)))
    .setMaterial(material);
  geometry.dispose();
  return doc.createMesh(name).addPrimitive(primitive);
}
