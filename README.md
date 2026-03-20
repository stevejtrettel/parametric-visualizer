# Parametric Visualizer

A Three.js framework for rendering parametric surfaces with custom shaders, interactive slicing, and reactive parameters.

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The default demo is set in `index.html` — change the `<script>` src to switch:

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

Each demo lives in its own folder under `demos/` with a `main.ts` entry point. To run a demo, point the `<script>` tag in `index.html` at it.

Every demo has an `autoAnimate` flag at the top of the file. Set it to `false` to start paused, or press Space at runtime to toggle.

---

## Surfaces

A **surface** is any object that maps 2D parameter coordinates (u, v) to 3D points. The framework provides two interfaces for this, defined in `src/surfaces/types.ts`.

### The `Surface` interface

The minimal interface — just a parametrization and its domain:

```ts
interface Surface {
  evaluate(u: number, v: number): THREE.Vector3;
  getDomain(): SurfaceDomain;
}

interface SurfaceDomain {
  uMin: number; uMax: number;
  vMin: number; vMax: number;
}
```

`evaluate(u, v)` returns the 3D point at parameter coordinates (u, v). `getDomain()` returns the rectangle in parameter space that gets sampled — for example, a torus uses `[0, 2pi] x [0, 2pi]`.

When you pass a `Surface` to `SurfaceMesh`, it samples a grid of (u, v) points across the domain, calls `evaluate()` at each one, and connects them into a triangle mesh. Normals are estimated automatically via `computeVertexNormals()`.

### The `DifferentialSurface` interface

Extends `Surface` with exact differential geometry:

```ts
interface DifferentialSurface extends Surface {
  computeNormal(u: number, v: number): THREE.Vector3;
  computePartials(u: number, v: number): SurfacePartials;  // { du, dv }
  computeMetric(u: number, v: number): FirstFundamentalForm; // { E, F, G }
}
```

If your surface implements `DifferentialSurface`, the mesh builder will use your `computeNormal()` for exact per-vertex normals instead of estimating them. This gives better shading, especially for surfaces with sharp features or high curvature.

The partials (`du`, `dv`) are the tangent vectors along each parameter direction. The first fundamental form (`E`, `F`, `G`) encodes the intrinsic metric — useful for computing arc lengths, areas, and curvatures if you need them.

`Torus` (in `src/surfaces/`) implements the full `DifferentialSurface`. `BoysSurface` and `KleinBottle` (in their respective demo folders) implement only `Surface` — both work fine, the normals are just estimated rather than exact.

### Three ways to define a surface

**1. Inline function** — for height fields z = f(x, y), no class needed:

```ts
const mesh = SurfaceMesh.fromFunction(
  (x, y) => Math.sin(x) * Math.cos(y),
  { domain: [-3, 3, -3, 3], uSegments: 64, vSegments: 64 },
);
```

This creates a `DifferentialSurface` internally using finite-difference normals. See `demos/wave/`.

**2. Library surface class** — import a reusable class like `Torus`:

```ts
const torus = new Torus({ R: 1.5, r: 0.6 });
const mesh = new SurfaceMesh(torus, { uSegments: 64, vSegments: 64 });
```

See `demos/simple/` and `demos/torus/`.

**3. Demo-specific surface class** — define your own alongside the demo:

```ts
// demos/my-demo/MySurface.ts
import * as THREE from 'three';
import type { Surface, SurfaceDomain } from '@/surfaces/types';

export class MySurface implements Surface {
  evaluate(u: number, v: number): THREE.Vector3 {
    const x = Math.cos(u) * (3 + Math.cos(v));
    const y = Math.sin(u) * (3 + Math.cos(v));
    const z = Math.sin(v);
    return new THREE.Vector3(x, y, z);
  }

  getDomain(): SurfaceDomain {
    return { uMin: 0, uMax: 2 * Math.PI, vMin: 0, vMax: 2 * Math.PI };
  }
}
```

See `demos/boys-surface/` and `demos/klein-bottle/`.

---

## `SurfaceMesh`

`SurfaceMesh` extends `THREE.Mesh`. It takes a `Surface`, samples it into geometry, and manages the material. You can use it with no shader at all (plain `MeshPhysicalMaterial`) or with a custom shader.

### Without a shader

```ts
const mesh = new SurfaceMesh(surface, {
  uSegments: 64,   // tessellation along u
  vSegments: 64,   // tessellation along v
  color: 0x4488ff,
  roughness: 0.3,
  metalness: 0.1,
});
```

This gives you a standard PBR material. All material properties are reactive — setting `mesh.roughness = 0.8` updates the material immediately.

### With a shader

Pass the output of `createSurfaceShader()` to override the fragment shader:

```ts
const shader = createSurfaceShader({ color: `return vec3(uv, 0.5);` });
const mesh = new SurfaceMesh(surface, { ...shader, uSegments: 64, vSegments: 64 });
```

The shader is applied via [three-custom-shader-material](https://github.com/FarazzShawororth/three-custom-shader-material) (CSM), which patches your GLSL into a `MeshPhysicalMaterial`. This means you get PBR lighting, environment maps, and tone mapping for free — you only write the color logic.

### Reactive parameters

`SurfaceMesh` properties are reactive via the `Params` system. Changing a property automatically triggers the right update:

| Property | Trigger | Effect |
|----------|---------|--------|
| `uSegments`, `vSegments` | `rebuild` | Re-tessellates the surface geometry |
| `color`, `roughness`, `metalness`, `transmission`, `wireframe` | `update` | Updates the material |

Surface classes can also have reactive params. `Torus` defines `R` and `r` with `triggers: 'rebuild'`, and `SurfaceMesh` registers itself as a dependent:

```ts
// Setting torus.R triggers:
// 1. torus.rebuild()  (if it has one — Torus doesn't, the Params system skips it)
// 2. mesh.rebuild()   (because mesh depends on torus)
torus.R = 2.0;
```

---

## Custom shaders

`createSurfaceShader()` generates a CSM-compatible shader. You provide a GLSL function body for the `color` option that must return a `vec3`:

```ts
const shader = createSurfaceShader({
  color: `
    float hue = uv.x;
    float sat = 0.8;
    float brightness = 0.6;
    return hsb2rgb(vec3(hue, sat, brightness));
  `,
});
```

### Available variables

Your color function runs inside a GLSL function with this signature:

```glsl
vec3 surfaceColor(vec2 uv, vec3 pos, float sliceField) { ... }
```

| Variable | Type | Description |
|----------|------|-------------|
| `uv` | `vec2` | Parametric coordinates, normalized to [0, 1] regardless of the surface's actual domain |
| `pos` | `vec3` | World-space position of the fragment |
| `sliceField` | `float` | Value of the slice scalar field (0.0 if no slicing) |

### Built-in GLSL helpers

Two utility functions are automatically included in every shader:

**`hsb2rgb(vec3 c) -> vec3`** — converts HSB (hue, saturation, brightness) to RGB. All components in [0, 1]. Hue wraps periodically, so values outside [0, 1] are fine.

**`coordGrid(vec2 uv, float scale) -> float`** — returns a multi-scale grid line intensity based on parametric coordinates. Useful as an additive overlay to visualize the parametrization:

```glsl
vec3 base = hsb2rgb(vec3(uv.x, 0.7, 0.6));
float grid = coordGrid(uv, 8.0);
return base + 1.5 * vec3(grid);
```

### Tips for periodic surfaces

On closed surfaces (torus, Klein bottle, etc.), the parametric coordinates wrap — `uv.x = 0` and `uv.x = 1` are the same point. If your color function uses `uv` to compute a hue or pattern, make sure it tiles seamlessly. Use integer coefficients so the value changes by a whole number (invisible for periodic quantities like hue):

```glsl
// Good: wraps seamlessly (integer coefficients)
float hue = fract(uv.x + 2.0 * uv.y);

// Bad: visible seam at uv.y = 0/1 (fractional coefficient)
float hue = fract(uv.x + 0.3 * uv.y);
```

### Custom uniforms

Pass additional uniforms to animate or control the shader from JavaScript:

```ts
const shader = createSurfaceShader({
  color: `return vec3(uTime * uv.x, uv.y, 0.5);`,
  uniforms: { uTime: { value: 0.0 } },
});

// In animation loop:
shader.uniforms.uTime.value = elapsed;
```

Uniform types are inferred from the initial value: `number` -> `float`, `THREE.Vector3` -> `vec3`, `boolean` -> `bool`, etc.

---

## Slicing

Slicing lets you cut away part of a surface to reveal its internal structure. It works entirely in the fragment shader: you define a scalar field on the surface, and fragments outside a sliding window are discarded.

### How it works

1. You provide a `sliceField` — a GLSL expression that computes a `float` at each fragment. This maps every point on the surface to a value, typically in [0, 1].

2. The shader discards any fragment where the field value falls outside the window `[uSlice - uSliceWidth, uSlice]`.

3. As you animate `uSlice` from 0 to 1, the visible window sweeps across the surface, revealing it progressively.

4. Fragments at the edges of the window are darkened to create a visible border.

### Setting up a sliced surface

```ts
import { createSurfaceShader } from '@/shaders/SurfaceShader';
import { createSlicedSurface } from '@/shaders/SlicedSurface';

const shader = createSurfaceShader({
  sliceField: 'uv.x',  // slice along the u parameter
  color: `return hsb2rgb(vec3(sliceField, 0.8, 0.5));`,
  border: 0.01,         // border width at slice edges (default: 0.01)
});

const sliced = createSlicedSurface(surface, shader, {
  uSegments: 64,
  vSegments: 128,
});
sliced.addTo(app.scene);
```

`createSlicedSurface` returns two meshes: the sliced surface itself, and a transparent glass overlay that shows the full shape as context. The glass is rendered behind the sliced surface using render ordering and polygon offset.

### Slice uniforms

When `sliceField` is provided, these uniforms are created automatically:

| Uniform | Type | Default | Description |
|---------|------|---------|-------------|
| `uSlice` | `float` | 1.0 | Upper bound of the visible window |
| `uSliceWidth` | `float` | 1.0 | Width of the visible window |
| `uBorderWidth` | `float` | border option | Darkened edge width |
| `uStripe` | `bool` | false | Enable stripe discard pattern |
| `uStripeFreq` | `float` | 10 | Stripe frequency |

Animate the slice by updating the uniforms:

```ts
app.addAnimateCallback((elapsed) => {
  const s = (1 - Math.cos(elapsed / 3)) / 2; // oscillate 0 → 1 → 0
  shader.uniforms.uSlice.value = s;
});
```

### Choosing a slice field

The `sliceField` is a GLSL expression with access to `uv` (parametric coords) and `pos` (world position). Different fields reveal different structure:

```ts
// Slice along a parameter direction
sliceField: 'uv.x'

// Slice by world-space height
sliceField: '(pos.y + 2.0) / 4.0'

// Radial slice from center of parameter space
sliceField: '2.0 * abs(uv.x - 0.5)'

// Sweepout along v with wrapping
sliceField: 'mod(1.25 - uv.y, 1.0)'
```

See `demos/boys-surface/` and `demos/klein-bottle/` for examples with multiple slice modes switchable via number keys.

### Stripes

Enable `stripes: true` to discard alternating bands within the visible window, creating a venetian-blind effect:

```ts
const shader = createSurfaceShader({
  sliceField: 'uv.x',
  color: `return hsb2rgb(vec3(uv.x, 0.8, 0.5));`,
  stripes: true,
  stripeFreq: 10,
});
```

---

## Reactive parameters (`Params`)

The `Params` system makes object properties reactive — when a value changes, dependent objects automatically rebuild or update. It uses `Object.defineProperty` to intercept setters.

### How it works

A class opts in by creating a `Params` instance and calling `define()` for each reactive property:

```ts
class Torus implements DifferentialSurface {
  readonly params = new Params(this);

  // Type declarations for reactive properties (created at runtime by Params.define)
  declare R: number;
  declare r: number;

  constructor(options: { R: number; r: number }) {
    this.params
      .define('R', options.R, { triggers: 'rebuild' })
      .define('r', options.r, { triggers: 'rebuild' });
  }
}
```

After this, `torus.R = 2.0` automatically calls `torus.rebuild()` (if it exists) and `rebuild()` on any dependents.

### Triggers

| Trigger | When to use | What it calls |
|---------|------------|---------------|
| `'rebuild'` | Property affects geometry (segment counts, surface parameters) | `owner.rebuild()` + dependents' `rebuild()` |
| `'update'` | Property affects material only (color, roughness) | `owner.update()` + dependents' `update()` |
| `'none'` | No automatic action — use `onChange` callback for custom logic | Nothing |

### Dependencies

`SurfaceMesh` registers itself as a dependent of its surface:

```ts
this.params.dependOn(surface);
```

This means changes to `torus.R` propagate to the mesh automatically — you don't need to manually call `mesh.rebuild()`.

---

## UI overlay

`App` provides an `overlay` for adding interactive controls. Currently supports range sliders:

```ts
app.overlay.addSlider({
  label: 'Slice',
  min: 0, max: 1, step: 0.01,
  value: 1,
  format: (v) => `Slice = ${v.toFixed(2)}`,
  onChange: (v) => {
    shader.uniforms.uSlice.value = v;
  },
});
```

The slider is positioned in a fixed overlay on top of the 3D canvas. `format` controls the label text. `onChange` fires on every input event as the slider is dragged.

---

## Architecture

```
src/                          <- library code (imported by demos via @/)
  core/
    App.ts                    — scene, camera, renderer, orbit controls, animation loop
    Params.ts                 — reactive parameter system (Object.defineProperty)
    types.ts                  — AnimateCallback, AppOptions, ParamOptions, etc.
  surfaces/
    types.ts                  — Surface, DifferentialSurface, SurfaceDomain interfaces
    buildGeometry.ts          — samples a Surface into a THREE.BufferGeometry
    SurfaceMesh.ts            — THREE.Mesh subclass with reactive params + shader support
    Torus.ts                  — reusable parametric torus (DifferentialSurface)
  shaders/
    SurfaceShader.ts          — generates CSM fragment/vertex shaders from options
    SlicedSurface.ts          — factory: sliced mesh + glass overlay with render ordering
    lib/
      hsb.glsl                — HSB to RGB conversion (Inigo Quilez)
      coordGrid.glsl          — multi-scale parametric coordinate grid
  ui/
    Input.ts                  — abstract base for UI inputs (mount/unmount/dispose)
    OverlaySlider.ts          — range slider component
    OverlayManager.ts         — slider container, imports CSS
    styles/
      theme.css               — base theme variables
      overlay.css             — overlay positioning and slider styles
  math/
    complex.ts                — complex number arithmetic (used by BoysSurface)
  index.ts                    — public API re-exports

demos/                        <- each demo is self-contained
  simple/main.ts              — no shader, just SurfaceMesh + material properties
  torus/main.ts               — custom shader with periodic coloring
  wave/main.ts                — SurfaceMesh.fromFunction() with per-frame rebuild
  boys-surface/               — defines BoysSurface locally (Surface interface)
    BoysSurface.ts
    main.ts
  klein-bottle/               — defines KleinBottle locally (Surface interface)
    KleinBottle.ts
    main.ts
```

## Build

```bash
npm run build    # outputs to dist/
npm run preview  # preview the build
```
