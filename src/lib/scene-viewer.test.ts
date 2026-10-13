import { describe, expect, it } from "vitest";
import { sceneViewerIntent } from "./scene-viewer";

describe("sceneViewerIntent", () => {
  const intent = sceneViewerIntent({
    fileUrl: "https://example.test/models/toy-car.glb",
    title: "Toy car",
    fallbackUrl: "https://example.test/models/toy-car",
  });

  it("targets Scene Viewer in AR-preferred mode with the model URL", () => {
    expect(intent.startsWith("intent://arvr.google.com/scene-viewer/1.0?")).toBe(true);
    const query = new URLSearchParams(intent.slice(intent.indexOf("?") + 1, intent.indexOf("#")));
    expect(query.get("file")).toBe("https://example.test/models/toy-car.glb");
    expect(query.get("mode")).toBe("ar_preferred");
    expect(query.get("title")).toBe("Toy car");
  });

  it("carries an encoded fallback so Android can come back to the page", () => {
    expect(intent).toContain("S.browser_fallback_url=https%3A%2F%2Fexample.test%2Fmodels%2Ftoy-car;end;");
  });

  it("refuses a plain http model, which Scene Viewer cannot fetch", () => {
    expect(() =>
      sceneViewerIntent({ fileUrl: "http://192.168.0.5:3000/m.glb", title: "x", fallbackUrl: "http://192.168.0.5:3000" }),
    ).toThrow(/https/);
  });
});
