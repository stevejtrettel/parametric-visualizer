# Parametric Visualizer

A Three.js framework for rendering parametric surfaces with custom shaders, interactive slicing, and reactive parameters.

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The default demo is set in [index.html](index.html) — change the `<script>` src to switch:

```html
<script type="module" src="/demos/torus/main.ts"></script>
```

### Controls

- **Mouse drag** — orbit the camera
- **Scroll** — zoom
- **Space** — toggle automatic animation
- **1–4** — switch slice mode (sliced demos only)

## Demos

| Demo | Description |
|------|-------------|
| `demos/simple/` | Plain torus with no custom shader — the simplest possible demo |
| `demos/torus/` | Colored torus with a custom shader and adjustable radii |
| `demos/wave/` | Animated height field — uses `SurfaceMesh.fromFunction()`, no surface class needed |
| `demos/boys-surface/` | Boy's surface with sliced rendering — defines its own `BoysSurface` class alongside the demo |
| `demos/klein-bottle/` | Klein bottle with glass overlay — defines its own `KleinBottle` class alongside the demo |

These four demos show the three ways to create a surface for a demo (see "Writing a demo" below).

## Writing a demo

Create a folder under `demos/` with a `main.ts`, then point `index.html` at it. There are three approaches for defining a surface, from simplest to most involved.

### 1. Inline function — `SurfaceMesh.fromFunction()`

For height fields z = f(x, y), no surface class needed at all:

```ts
import { SurfaceMesh } from '@/surfaces/SurfaceMesh';

const mesh = SurfaceMesh.fromFunction(
  (x, y) => Math.sin(x) * Math.cos(y),
  { domain: [-3, 3, -3, 3], uSegments: 64, vSegments: 64 },
);
app.scene.add(mesh);
```

See `demos/wave/` for a full example with animation.

### 2. Reusable surface class from the library

The library ships `Torus` in `src/surfaces/` — a surface class with reactive parameters that any demo can import:

```ts
import { Torus } from '@/surfaces/Torus';
import { SurfaceMesh } from '@/surfaces/SurfaceMesh';

const torus = new Torus({ R: 1.5, r: 0.6 });
const mesh = new SurfaceMesh(torus, { uSegments: 64, vSegments: 64 });
app.scene.add(mesh);

torus.R = 2.0; // geometry automatically regenerates
```

See `demos/torus/` for a full example.

### 3. Demo-specific surface class

For complex or one-off surfaces, define the class alongside your demo. Implement the `Surface` interface (or `DifferentialSurface` for exact normals):

```ts
// demos/my-demo/MySurface.ts
import * as THREE from 'three';
import type { Surface, SurfaceDomain } from '@/surfaces/types';

export class MySurface implements Surface {
  evaluate(u: number, v: number): THREE.Vector3 {
    // your parametrization here
    return new THREE.Vector3(/* ... */);
  }

  getDomain(): SurfaceDomain {
    return { uMin: 0, uMax: 2 * Math.PI, vMin: 0, vMax: 2 * Math.PI };
  }
}
```

```ts
// demos/my-demo/main.ts
import { MySurface } from './MySurface';

const surface = new MySurface();
const mesh = new SurfaceMesh(surface, { uSegments: 64, vSegments: 64 });
```

See `demos/boys-surface/` and `demos/klein-bottle/` for full examples — each defines its own surface class next to `main.ts`.

## Custom shaders

Use `createSurfaceShader` to color your surface with a GLSL function body returning `vec3`:

```ts
import { createSurfaceShader } from '@/shaders/SurfaceShader';

const shader = createSurfaceShader({
  color: `
    float hue = uv.x;
    return hsb2rgb(vec3(hue, 0.7, 0.6));
  `,
});

const mesh = new SurfaceMesh(torus, { ...shader });
```

Available in the color function:

- `uv` — parametric coordinates (vec2, in [0,1])
- `pos` — world position (vec3)
- `sliceField` — scalar field value (float, 0 if no slicing)
- `hsb2rgb(vec3)` — HSB to RGB conversion
- `coordGrid(uv, freq)` — parametric coordinate grid lines

### Slicing

Add a `sliceField` to get interactive cross-sections with a glass overlay:

```ts
const shader = createSurfaceShader({
  sliceField: 'uv.x',           // GLSL expression → float in [0,1]
  color: `return hsb2rgb(vec3(uv.x, 0.8, 0.5));`,
});

const sliced = createSlicedSurface(surface, shader);
sliced.addTo(app.scene);

// Control the slice window:
shader.uniforms.uSlice.value = 0.5;      // where to slice
shader.uniforms.uSliceWidth.value = 0.3;  // visible window width
```

## Architecture

```
src/                          ← library code (imported by demos via @/)
├── core/
│   ├── App.ts                — scene, camera, renderer, animation loop
│   ├── Params.ts             — reactive parameter system
│   └── types.ts
├── surfaces/
│   ├── types.ts              — Surface / DifferentialSurface interfaces
│   ├── buildGeometry.ts      — evaluate surface → BufferGeometry
│   ├── SurfaceMesh.ts        — THREE.Mesh with reactive params and shader support
│   └── Torus.ts              — reusable parametric torus
├── shaders/
│   ├── SurfaceShader.ts      — generates CSM fragment/vertex shaders
│   ├── SlicedSurface.ts      — factory for sliced mesh + glass overlay
│   └── lib/                  — shared GLSL (hsb, coordGrid)
├── ui/
│   ├── Input.ts              — abstract base for UI inputs
│   ├── OverlaySlider.ts      — range slider component
│   └── OverlayManager.ts     — slider container
├── math/
│   └── complex.ts            — complex number operations
└── index.ts                  — public API exports

demos/                        ← each demo is self-contained
├── torus/main.ts             — uses library Torus class
├── wave/main.ts              — uses SurfaceMesh.fromFunction()
├── boys-surface/             — defines BoysSurface locally
│   ├── BoysSurface.ts
│   └── main.ts
└── klein-bottle/             — defines KleinBottle locally
    ├── KleinBottle.ts
    └── main.ts
```

## Build

```bash
npm run build    # outputs to dist/
npm run preview  # preview the build
```
