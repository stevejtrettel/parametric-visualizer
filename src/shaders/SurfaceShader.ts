/**
 * SurfaceShader — generates { fragmentShader, vertexShader, uniforms } for SurfaceMesh.
 *
 * Builds a CSM-compatible shader for parametric surfaces. Slicing is an
 * optional first-class feature: provide a scalar field and the shader
 * handles the discard window, borders, and stripes automatically.
 *
 * @example Color only (no slicing)
 *   const shader = createSurfaceShader({
 *     color: `return hsb2rgb(vec3(uv.x, 0.8, 0.6));`,
 *   });
 *
 * @example Sliced with animation
 *   const shader = createSurfaceShader({
 *     sliceField: '1.0 - uv.x',
 *     color: `return hsb2rgb(vec3(sliceField, 0.75, 0.5));`,
 *   });
 *   // animate: shader.uniforms.uSlice.value = t;
 */

import hsbGLSL from './lib/hsb.glsl?raw';
import coordGridGLSL from './lib/coordGrid.glsl?raw';

export interface SurfaceShaderOptions {
  /**
   * GLSL expression computing a float scalar field on the surface.
   * Available variables: `uv` (vec2, [0,1]²), `pos` (vec3, world position).
   *
   * When provided, fragments outside the slice window are discarded.
   * When omitted, no slicing occurs.
   */
  sliceField?: string;

  /**
   * GLSL function body returning vec3 color.
   * Available: `uv`, `pos`, `sliceField`, `hsb2rgb()`, `coordGrid()`.
   * Must contain a `return` statement.
   */
  color: string;

  /** Border width at slice edges. Default: 0.01 */
  border?: number;

  /** Enable stripe discard pattern. Default: false */
  stripes?: boolean;

  /** Stripe frequency. Default: 10 */
  stripeFreq?: number;

  /** Additional uniforms to include. */
  uniforms?: Record<string, { value: any }>;
}

export interface SurfaceShaderResult {
  fragmentShader: string;
  vertexShader: string;
  uniforms: Record<string, { value: any }>;
}

export function createSurfaceShader(options: SurfaceShaderOptions): SurfaceShaderResult {
  const {
    sliceField,
    color,
    border = 0.01,
    stripes = false,
    stripeFreq = 10,
    uniforms: extraUniforms = {},
  } = options;

  const hasSlice = sliceField != null;

  const uniforms: Record<string, { value: any }> = { ...extraUniforms };
  if (hasSlice) {
    uniforms.uSlice = { value: 1.0 };
    uniforms.uSliceWidth = { value: 1.0 };
    uniforms.uBorderWidth = { value: border };
    uniforms.uStripe = { value: stripes };
    uniforms.uStripeFreq = { value: stripeFreq };
  }

  const vertexShader = `
varying vec3 vWorldPos;
void main() {
  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
}
`;

  const frag: string[] = [];

  frag.push('varying vec3 vWorldPos;');
  if (hasSlice) {
    frag.push(`
uniform float uSlice;
uniform float uSliceWidth;
uniform float uBorderWidth;
uniform bool  uStripe;
uniform float uStripeFreq;
`);
  }

  for (const [name, u] of Object.entries(extraUniforms)) {
    frag.push(`uniform ${glslType(u.value)} ${name};`);
  }

  frag.push(hsbGLSL);
  frag.push(coordGridGLSL);

  frag.push(`
vec3 surfaceColor(vec2 uv, vec3 pos, float sliceField) {
  ${color}
}
`);

  if (hasSlice) {
    frag.push(`
void main() {
  vec2 uv = vMapUv;
  vec3 pos = vWorldPos;
  float sliceField = ${sliceField};

  if (sliceField < uSlice - uSliceWidth || sliceField > uSlice) discard;
  if (uStripe && sin(uStripeFreq * 3.14159265 * sliceField) >= 0.0) discard;

  vec3 color = surfaceColor(uv, pos, sliceField);

  if (uBorderWidth > 0.0) {
    if (abs(sliceField - uSlice) < uBorderWidth ||
        abs(sliceField - (uSlice - uSliceWidth)) < uBorderWidth) {
      color *= 0.2;
    }
  }

  csm_DiffuseColor = vec4(color, 1.0);
}
`);
  } else {
    frag.push(`
void main() {
  vec2 uv = vMapUv;
  vec3 pos = vWorldPos;
  float sliceField = 0.0;
  vec3 color = surfaceColor(uv, pos, sliceField);
  csm_DiffuseColor = vec4(color, 1.0);
}
`);
  }

  return { fragmentShader: frag.join('\n'), vertexShader, uniforms };
}

function glslType(value: any): string {
  if (typeof value === 'boolean') return 'bool';
  if (typeof value === 'number') return 'float';
  if (value?.isVector2) return 'vec2';
  if (value?.isVector3) return 'vec3';
  if (value?.isVector4) return 'vec4';
  if (value?.isColor) return 'vec3';
  if (value?.isMatrix3) return 'mat3';
  if (value?.isMatrix4) return 'mat4';
  return 'float';
}
