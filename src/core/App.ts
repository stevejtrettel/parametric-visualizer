/**
 * Minimal App for parametric surface demos.
 *
 * Provides: scene, camera, renderer, orbit controls, HDR environment,
 * overlay sliders, animation loop, and optional debug stats.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { OverlayManager } from '../ui/OverlayManager';
import type { AnimateCallback, AppOptions } from './types';

// ── Background helpers ──

export interface HDROptions {
  asEnvironment?: boolean;
  asBackground?: boolean;
  intensity?: number;
}

class BackgroundManager {
  private scene: THREE.Scene;
  private pmremGenerator: THREE.PMREMGenerator;

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.pmremGenerator = new THREE.PMREMGenerator(renderer);
  }

  setColor(color: number): void {
    this.scene.background = new THREE.Color(color);
  }

  loadHDR(url: string, options: HDROptions = {}): void {
    const { asEnvironment = true, asBackground = true, intensity = 1 } = options;

    new RGBELoader().load(url, (texture) => {
      const envMap = this.pmremGenerator.fromEquirectangular(texture).texture;
      texture.dispose();

      if (asEnvironment) {
        this.scene.environment = envMap;
        this.scene.environmentIntensity = intensity;
      }
      if (asBackground) {
        this.scene.background = envMap;
      }
    });
  }

  dispose(): void {
    this.pmremGenerator.dispose();
  }
}

// ── App ──

export class App {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  backgrounds: BackgroundManager;
  overlay: OverlayManager;

  private animateCallbacks: AnimateCallback[] = [];
  private clock = new THREE.Clock();
  private elapsed = 0;

  constructor(options: AppOptions = {}) {
    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      options.fov ?? 50,
      window.innerWidth / window.innerHeight,
      options.near ?? 0.1,
      options.far ?? 1000,
    );
    this.camera.position.set(0, 0, 5);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: options.antialias ?? true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.toneMapping = this.getToneMapping(options.toneMapping ?? 'aces');
    this.renderer.toneMappingExposure = options.toneMappingExposure ?? 1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(this.renderer.domElement);
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // Backgrounds
    this.backgrounds = new BackgroundManager(this.scene, this.renderer);

    // Overlay
    this.overlay = new OverlayManager(document.body);

    // Resize
    window.addEventListener('resize', this.onResize);

    // Debug stats
    if (options.debug) {
      this.enableDebug();
    }
  }

  addAnimateCallback(fn: AnimateCallback): void {
    this.animateCallbacks.push(fn);
  }

  start(): void {
    this.clock.start();
    this.animate();
  }

  private animate = () => {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    this.elapsed += delta;

    this.controls.update();
    for (const fn of this.animateCallbacks) fn(this.elapsed, delta);

    this.renderer.render(this.scene, this.camera);
  };

  private onResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private enableDebug(): void {
    // Minimal: FPS counter in title
    let frames = 0;
    let lastTime = performance.now();

    const update = () => {
      frames++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        document.title = `${frames} fps`;
        frames = 0;
        lastTime = now;
      }
      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  private getToneMapping(type: string): THREE.ToneMapping {
    const map: Record<string, THREE.ToneMapping> = {
      none: THREE.NoToneMapping,
      aces: THREE.ACESFilmicToneMapping,
      reinhard: THREE.ReinhardToneMapping,
      cineon: THREE.CineonToneMapping,
      neutral: THREE.NeutralToneMapping,
    };
    return map[type] ?? THREE.ACESFilmicToneMapping;
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    this.controls.dispose();
    this.backgrounds.dispose();
    this.overlay.dispose();
    this.renderer.dispose();
  }
}
