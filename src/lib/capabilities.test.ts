import { describe, expect, it } from "vitest";
import { chooseArPath, detectPlatform, type DeviceCapabilities } from "./capabilities";

const UA = {
  iphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
  ipadDesktopMode:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15",
  chromeIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0 Mobile/15E148 Safari/604.1",
  pixel:
    "Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36",
  windows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36",
  quest:
    "Mozilla/5.0 (X11; Linux x86_64; Quest 3) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/38.0 Chrome/138.0 VR Safari/537.36",
};

describe("detectPlatform", () => {
  it.each([
    ["iPhone Safari", UA.iphone, 5, "ios"],
    ["iPad asking for the desktop site", UA.ipadDesktopMode, 5, "ios"],
    ["a real Mac", UA.ipadDesktopMode, 0, "other"],
    ["Chrome on iOS", UA.chromeIos, 5, "ios"],
    ["Android Chrome", UA.pixel, 5, "android"],
    ["Windows desktop", UA.windows, 0, "other"],
    ["Meta Quest browser", UA.quest, 0, "other"],
  ] as const)("%s -> %s", (_label, ua, touchPoints, expected) => {
    expect(detectPlatform(ua, touchPoints)).toBe(expected);
  });
});

describe("chooseArPath", () => {
  const caps = (over: Partial<DeviceCapabilities>): DeviceCapabilities => ({
    platform: "other",
    webxrAr: false,
    quickLook: false,
    secureContext: true,
    ...over,
  });

  it.each([
    ["iPhone with Quick Look", caps({ platform: "ios", quickLook: true }), "quick-look"],
    ["iOS in-app browser without Quick Look", caps({ platform: "ios" }), "preview"],
    ["iOS keeps Quick Look even if WebXR ever reports AR", caps({ platform: "ios", quickLook: true, webxrAr: true }), "quick-look"],
    ["Android Chrome with ARCore", caps({ platform: "android", webxrAr: true }), "webxr"],
    ["Android without WebXR", caps({ platform: "android" }), "scene-viewer"],
    ["Android over plain http", caps({ platform: "android", webxrAr: true, secureContext: false }), "scene-viewer"],
    ["headset with immersive-ar", caps({ webxrAr: true }), "webxr"],
    ["desktop", caps({}), "preview"],
  ] as const)("%s -> %s", (_label, input, expected) => {
    expect(chooseArPath(input)).toBe(expected);
  });
});
