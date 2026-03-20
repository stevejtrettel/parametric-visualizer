/**
 * Torus — a simple colored torus with no slicing.
 *
 * Demonstrates the basics: surface + shader + mesh + rotation.
 */

import * as THREE from 'three';
import { App } from '@/core/App';
import { Torus } from '@/surfaces/Torus';
import { SurfaceMesh } from '@/surfaces/SurfaceMesh';
import { createSurfaceShader } from '@/shaders/SurfaceShader';

// --- Config ---

/** Set to false to disable rotation (press Space to toggle at runtime). */
let autoAnimate = true;

// --- Scene ---

const app = new App({ antialias: true });
app.camera.position.set(0, 3, 12);
app.controls.target.set(0, 0, 0);
app.controls.update();

app.backgrounds.loadHDR('/assets/hdri/studio.hdr', {
  asEnvironment: true,
  asBackground: false,
  intensity: 1.5,
});
app.backgrounds.setColor(0x1a1a2e);

const light = new THREE.DirectionalLight(0xffffff, 3);
light.position.set(5, 3, 4);
app.scene.add(light);
app.scene.add(new THREE.AmbientLight(0xffffff, 0.5));

// --- Surface ---

const torus = new Torus({ R: 1.5, r: 0.6 });

const shader = createSurfaceShader({
  color: `
    float hue = uv.x + 0.3 * uv.y;
    vec3 base = hsb2rgb(vec3(hue, 0.7, 0.6));
    float grid = coordGrid(uv, 8.0);
    return base + 1.5 * vec3(grid);
  `,
});

const mesh = new SurfaceMesh(torus, {
  ...shader,
  uSegments: 64,
  vSegments: 64,
  roughness: 0.3,
  metalness: 0.1,
});
app.scene.add(mesh);

// --- UI ---

app.overlay.addSlider({
  label: 'Major radius',
  min: 0.5, max: 3, step: 0.1, value: torus.R,
  format: (v) => `R = ${v.toFixed(1)}`,
  onChange: (v) => { torus.R = v; },
});

app.overlay.addSlider({
  label: 'Minor radius',
  min: 0.1, max: 1.5, step: 0.05, value: torus.r,
  format: (v) => `r = ${v.toFixed(2)}`,
  onChange: (v) => { torus.r = v; },
});

window.addEventListener('keydown', (e) => {
  if (e.key === ' ') autoAnimate = !autoAnimate;
});

// --- Animation ---

app.addAnimateCallback((elapsed) => {
  if (autoAnimate) {
    mesh.rotation.y = elapsed * 0.2;
  }
});

app.start();
