import { describe, expect, it } from "vitest";
import raw from "./models.json";
import { modelUrl, parseCatalog } from "./schema";

const messageOf = (input: unknown): string => {
  try {
    parseCatalog(input);
    return "";
  } catch (error) {
    return (error as Error).message;
  }
};

describe("parseCatalog", () => {
  it("accepts the shipped catalog", () => {
    expect(parseCatalog(raw).models.map((m) => m.id)).toEqual(["potted-plant", "toy-car", "lantern", "toy-robot"]);
  });

  it("serves every model from /models/<id>.glb", () => {
    expect(modelUrl({ id: "toy-car" })).toBe("/models/toy-car.glb");
  });

  it("rejects duplicate ids", () => {
    expect(messageOf({ models: [raw.models[0], raw.models[0]] })).toMatch(/unique/);
  });

  it("rejects sizes that are not real-world metres", () => {
    const input = structuredClone(raw);
    input.models[0].dimensionsM.height = 55;
    expect(messageOf(input)).toMatch(/dimensionsM\.height/);
  });

  it("rejects a Khronos source without a SHA-256 pin", () => {
    const input = structuredClone(raw);
    input.models[1].source.sha256 = "latest";
    expect(messageOf(input)).toMatch(/sha256/);
  });

  it("rejects an unknown licence and a non-kebab id, reporting both", () => {
    const input = structuredClone(raw);
    input.models[2].credit.license = "All rights reserved";
    input.models[3].id = "Toy Robot";
    const message = messageOf(input);
    expect(message).toMatch(/license/);
    expect(message).toMatch(/kebab-case/);
  });

  it("rejects something that is not a catalog at all", () => {
    expect(messageOf("models")).toMatch(/Invalid model catalog/);
  });
});
