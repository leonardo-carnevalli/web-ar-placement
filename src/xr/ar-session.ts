import {
  PerspectiveCamera,
  Plane,
  Quaternion,
  Raycaster,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Camera,
  type WebXRCamera,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { XREstimatedLight } from "three/examples/jsm/webxr/XREstimatedLight.js";
import {
  clampScale,
  isTap,
  screenRotationToYaw,
  screenToNdc,
  twoFingerDelta,
  type Point,
  type TouchPair,
} from "@/lib/gestures";
import { isHorizontalSurface } from "@/lib/surfaces";
import { captureFrame } from "./capture";
import { createStage } from "./stage";

export type ArPhase = "loading" | "scanning" | "aiming" | "placed";

export interface ArState {
  phase: ArPhase;
  scale: number;
  lightEstimation: boolean;
  cameraAccess: boolean;
}

export interface ArSessionHandle {
  capture(): Promise<Blob>;
  reset(): void;
  end(): void;
}

interface Options {
  session: XRSession;
  modelUrl: string;
  /** The DOM overlay element; it also receives the touch gestures. */
  overlay: HTMLElement;
  onState(state: ArState): void;
  onEnd(): void;
}

/**
 * Runs an immersive-ar session that the caller already requested inside a tap (WebXR needs
 * the user gesture), with AR_SESSION_INIT and the overlay as domOverlay root.
 */
export async function runArSession({ session, modelUrl, overlay, onState, onEnd }: Options): Promise<ArSessionHandle> {
  const enabled = (feature: string) => session.enabledFeatures?.includes(feature) ?? false;
  const state: ArState = {
    phase: "loading",
    scale: 1,
    lightEstimation: false,
    cameraAccess: enabled("camera-access"),
  };
  const emit = () => onState({ ...state });

  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType("local");

  const stage = createStage(renderer);
  const estimatedLight = new XREstimatedLight(renderer);
  estimatedLight.addEventListener("estimationstart", () => {
    stage.scene.add(estimatedLight);
    stage.fallbackLights.visible = false;
    if (estimatedLight.environment) stage.scene.environment = estimatedLight.environment;
    state.lightEstimation = true;
    emit();
  });

  await renderer.xr.setSession(session);
  const referenceSpace = renderer.xr.getReferenceSpace();
  const viewerSpace = await session.requestReferenceSpace("viewer");
  const hitTestSource = await session.requestHitTestSource?.({ space: viewerSpace });
  if (!referenceSpace || !hitTestSource) throw new Error("This device cannot hit-test surfaces");

  emit();
  new GLTFLoader().loadAsync(modelUrl).then(
    (gltf) => {
      stage.setModel(gltf.scene);
      state.phase = "scanning";
      emit();
    },
    () => session.end(),
  );

  // Placement and gestures
  const raycaster = new Raycaster();
  const groundPlane = new Plane();
  const grabOffset = new Vector3();
  const hit = new Vector3();
  let viewCamera: Camera = stage.camera;
  let pendingCapture: { resolve(blob: Blob): void; reject(error: unknown): void } | null = null;

  const pointOnGround = (point: Point): Vector3 | null => {
    const ndc = screenToNdc(point, overlay.clientWidth, overlay.clientHeight);
    raycaster.setFromCamera(new Vector2(ndc.x, ndc.y), viewCamera);
    groundPlane.set(new Vector3(0, 1, 0), -stage.anchor.position.y);
    return raycaster.ray.intersectPlane(groundPlane, hit);
  };

  const place = () => {
    const { anchor, reticle } = stage;
    reticle.matrix.decompose(anchor.position, new Quaternion(), new Vector3());
    const camera = new Vector3().setFromMatrixPosition(viewCamera.matrixWorld);
    anchor.rotation.set(0, Math.atan2(camera.x - anchor.position.x, camera.z - anchor.position.z), 0);
    anchor.visible = stage.shadowCatcher.visible = true;
    reticle.visible = false;
    stage.followAnchor();
    state.phase = "placed";
    emit();
  };

  let tapStart: { at: number; point: Point } | null = null;
  let pair: TouchPair | null = null;
  const pointOf = (touch: Touch): Point => ({ x: touch.clientX, y: touch.clientY });
  const fromControls = (event: TouchEvent) => (event.target as Element).closest("[data-ar-controls]") !== null;

  const onTouchStart = (event: TouchEvent) => {
    if (fromControls(event)) return;
    const touches = Array.from(event.touches, pointOf);
    pair = touches.length === 2 ? [touches[0], touches[1]] : null;
    tapStart = touches.length === 1 ? { at: performance.now(), point: touches[0] } : null;
    if (touches.length === 1 && state.phase === "placed") {
      const ground = pointOnGround(touches[0]);
      if (ground) grabOffset.subVectors(stage.anchor.position, ground);
    }
  };

  const onTouchMove = (event: TouchEvent) => {
    if (fromControls(event) || state.phase !== "placed") return;
    const touches = Array.from(event.touches, pointOf);
    if (touches.length === 2 && pair) {
      const next: TouchPair = [touches[0], touches[1]];
      const delta = twoFingerDelta(pair, next);
      stage.anchor.rotation.y += screenRotationToYaw(delta.rotation);
      state.scale = clampScale(state.scale * delta.scale);
      stage.anchor.scale.setScalar(state.scale);
      pair = next;
      emit();
    } else if (touches.length === 1 && !pair) {
      const ground = pointOnGround(touches[0]);
      if (ground) stage.anchor.position.copy(ground).add(grabOffset);
      stage.followAnchor();
    }
  };

  const onTouchEnd = (event: TouchEvent) => {
    if (fromControls(event)) return;
    const ended = event.changedTouches[0];
    if (tapStart && ended && state.phase === "aiming" && isTap(performance.now() - tapStart.at, tapStart.point, pointOf(ended))) {
      place();
    }
    if (event.touches.length === 0) pair = null;
    tapStart = null;
  };

  // With a DOM overlay every touch is handled above, so XR select events are suppressed.
  // Without one (the feature is optional) the overlay never sees touches: a tap places via select.
  const suppressXrSelect = (event: Event) => event.preventDefault();
  const placeOnSelect = () => state.phase === "aiming" && place();
  if (enabled("dom-overlay")) overlay.addEventListener("beforexrselect", suppressXrSelect);
  else session.addEventListener("select", placeOnSelect);
  overlay.addEventListener("touchstart", onTouchStart, { passive: true });
  overlay.addEventListener("touchmove", onTouchMove, { passive: true });
  overlay.addEventListener("touchend", onTouchEnd, { passive: true });

  // Frame loop
  renderer.setAnimationLoop((_time, frame) => {
    if (!frame) return;
    const xrCamera = renderer.xr.getCamera();
    viewCamera = xrCamera.cameras[0] ?? xrCamera;

    if (state.phase === "scanning" || state.phase === "aiming") {
      const pose = frame
        .getHitTestResults(hitTestSource)
        .map((result) => result.getPose(referenceSpace))
        .find((candidate) => candidate && isHorizontalSurface(candidate.transform.matrix));
      stage.reticle.visible = Boolean(pose);
      if (pose) stage.reticle.matrix.fromArray(pose.transform.matrix);
      const phase = pose ? "aiming" : "scanning";
      if (phase !== state.phase) {
        state.phase = phase;
        emit();
      }
    }

    renderer.render(stage.scene, stage.camera);

    if (pendingCapture) {
      const request = pendingCapture;
      pendingCapture = null;
      const cameraFeed = frame.getViewerPose(referenceSpace)?.views[0]?.camera;
      // three keys camera textures by the WebXR XRCamera, although its typings name a three camera.
      const image = cameraFeed ? (renderer.xr.getCameraTexture(cameraFeed as unknown as WebXRCamera) ?? null) : null;
      const size = cameraFeed
        ? new Vector2(cameraFeed.width, cameraFeed.height)
        : renderer.getDrawingBufferSize(new Vector2());
      captureFrame(renderer, stage.scene, snapshot(viewCamera), size.x, size.y, image).then(
        request.resolve,
        request.reject,
      );
    }
  });

  session.addEventListener("end", () => {
    renderer.setAnimationLoop(null);
    overlay.removeEventListener("touchstart", onTouchStart);
    overlay.removeEventListener("touchmove", onTouchMove);
    overlay.removeEventListener("touchend", onTouchEnd);
    overlay.removeEventListener("beforexrselect", suppressXrSelect);
    pendingCapture?.reject(new Error("The AR session ended"));
    // Ending the session already cancelled the hit-test source.
    stage.dispose();
    renderer.dispose();
    onEnd();
  });

  return {
    capture: () => new Promise<Blob>((resolve, reject) => (pendingCapture = { resolve, reject })),
    reset() {
      stage.anchor.visible = stage.shadowCatcher.visible = false;
      stage.anchor.scale.setScalar((state.scale = 1));
      state.phase = "scanning";
      emit();
    },
    end: () => void session.end(),
  };
}

/** A plain camera frozen at the view's pose and projection, safe to render outside the XR loop. */
function snapshot(view: Camera): PerspectiveCamera {
  const camera = new PerspectiveCamera();
  view.matrixWorld.decompose(camera.position, camera.quaternion, camera.scale);
  camera.updateMatrixWorld(true);
  camera.projectionMatrix.copy(view.projectionMatrix);
  camera.projectionMatrixInverse.copy(view.projectionMatrixInverse);
  return camera;
}
