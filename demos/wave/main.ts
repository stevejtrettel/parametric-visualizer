/**
 * Wave — an animated z = f(x,y) height field.
 *
 * Demonstrates SurfaceMesh.fromFunction() for quick surface plots
 * with per-frame geometry rebuilds for animation.
 */

import * as THREE from 'three';
import { App } from '@/core/App';
import { SurfaceMesh } from '@/surfaces/SurfaceMesh';
import { createSurfaceShader } from '@/shaders/SurfaceShader';

// --- Config ---

/** Set to false to freeze the wave (press Space to toggle at runtime). */
let autoAnimate = true;

// --- Scene ---

const app = new App({ antialias: true });
app.camera.position.set(8, 6, 8);
app.controls.target.set(0, 0, 0);
app.controls.update();

app.backgrounds.loadHDR('/assets/hdri/studio.hdr', {
  asEnvironment: true,
  asBackground: false,
  intensity: 1.5,
});
app.backgrounds.setColor(0x1a1a2e);

const light = new THREE.DirectionalLight(0xffffff, 3);
light.position.set(5, 5, 4);
app.scene.add(light);
app.scene.add(new THREE.AmbientLight(0xffffff, 0.5));

// --- Surface ---

let time = 0;

const shader = createSurfaceShader({
  color: `
    float height = (pos.z + 0.5) / 1.0;
    float hue = 0.55 + 0.3 * height;
    vec3 base = hsb2rgb(vec3(hue, 0.7, 0.6));
    float grid = coordGrid(uv, 8.0);
    return base + 1.5 * vec3(grid);
  `,
});

const mesh = SurfaceMesh.fromFunction(
  (x, y) => {
    const r = Math.sqrt(x * x + y * y);
    return 0.5 * Math.sin(r * 3 - time * 2) * Math.exp(-r * 0.3);
  },
  {
    ...shader,
    domain: [-4, 4, -4, 4],
    uSegments: 64,
    vSegments: 64,
    roughness: 0.4,
    metalness: 0.05,
  },
);
app.scene.add(mesh);

// --- UI ---

window.addEventListener('keydown', (e) => {
  if (e.key === ' ') autoAnimate = !autoAnimate;
});

// --- Animation ---

app.addAnimateCallback((elapsed) => {
  if (autoAnimate) {
    time = elapsed;
    // Rebuild geometry since the wave function depends on time
    mesh.rebuild();
  }
});

app.start();
