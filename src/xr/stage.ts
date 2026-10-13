import {
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  RingGeometry,
  Scene,
  ShadowMaterial,
  type Object3D,
  type WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/** Everything the AR session draws, apart from the model itself. */
export interface Stage {
  scene: Scene;
  camera: PerspectiveCamera;
  /** Holds the model; moved, turned and scaled by the gestures. */
  anchor: Group;
  reticle: Mesh;
  /** Invisible plane under the model that only shows the shadow it receives. */
  shadowCatcher: Mesh;
  /** Lights used until (or unless) the device gives a light estimate. */
  fallbackLights: Group;
  sun: DirectionalLight;
  setModel(model: Object3D): void;
  /** Keeps the shadow catcher and the sun's shadow camera on the model. */
  followAnchor(): void;
  dispose(): void;
}

export function createStage(renderer: WebGLRenderer): Stage {
  const scene = new Scene();
  const camera = new PerspectiveCamera(70, 1, 0.01, 40);

  const pmrem = new PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.environment = environment;

  const reticle = new Mesh(
    new RingGeometry(0.07, 0.09, 40).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }),
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  const shadowCatcher = new Mesh(
    new PlaneGeometry(3, 3).rotateX(-Math.PI / 2),
    new ShadowMaterial({ opacity: 0.35 }),
  );
  shadowCatcher.receiveShadow = true;
  shadowCatcher.visible = false;
  scene.add(shadowCatcher);

  const anchor = new Group();
  anchor.visible = false;
  scene.add(anchor);

  const sun = new DirectionalLight(0xffffff, 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 0.1;
  sun.shadow.camera.far = 6;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -1;
  sun.shadow.camera.right = sun.shadow.camera.top = 1;
  sun.shadow.bias = -0.0005;
  sun.target = anchor;
  scene.add(sun);

  const fallbackLights = new Group();
  fallbackLights.add(new HemisphereLight(0xffffff, 0x8d8d8d, 1.2));
  scene.add(fallbackLights);

  return {
    scene,
    camera,
    anchor,
    reticle,
    shadowCatcher,
    fallbackLights,
    sun,
    setModel(model) {
      model.traverse((child) => {
        if ((child as Mesh).isMesh) child.castShadow = true;
      });
      anchor.add(model);
    },
    followAnchor() {
      shadowCatcher.position.copy(anchor.position);
      sun.position.set(anchor.position.x + 0.6, anchor.position.y + 2, anchor.position.z + 0.4);
    },
    dispose() {
      environment.dispose();
      scene.traverse((child) => {
        const mesh = child as Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        for (const material of [mesh.material].flat()) material.dispose();
      });
    },
  };
}
