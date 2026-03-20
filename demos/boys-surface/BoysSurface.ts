import * as THREE from 'three';
import type { Surface, SurfaceDomain } from '@/surfaces/types';
import { cmul, cdiv, cadd, csub, cscale, type Complex } from '@/math/complex';

const SQRT5 = Math.sqrt(5);
const ONE: Complex = [1, 0];

/**
 * Boy's surface — an immersion of RP² in R³.
 *
 * Uses the Bryant–Kusner parametrization over the unit disk.
 * Domain: u ∈ [0, 1] (radius), v ∈ [0, 2π] (angle).
 */
export class BoysSurface implements Surface {
  private readonly epsilon: number;
  private readonly scale: number;

  constructor(options?: { epsilon?: number; scale?: number }) {
    this.epsilon = options?.epsilon ?? 0.0001;
    this.scale = options?.scale ?? 2;
  }

  evaluate(u: number, v: number): THREE.Vector3 {
    const r = u + this.epsilon;
    const z: Complex = [r * Math.cos(v), r * Math.sin(v)];

    const z2 = cmul(z, z);
    const z3 = cmul(z2, z);
    const z4 = cmul(z, z3);
    const z6 = cmul(z3, z3);

    const denom = csub(cadd(z6, cscale(SQRT5, z3)), ONE);

    const G1 = cscale(-1.5, cdiv(cmul(z, csub(ONE, z4)), denom));
    const G2 = cscale(-1.5, cdiv(cmul(z, cadd(ONE, z4)), denom));
    const G3 = cdiv(cadd(ONE, z6), denom);

    const g1 = G1[1];
    const g2 = G2[0];
    const g3 = G3[1] - 0.5;
    const g = g1 * g1 + g2 * g2 + g3 * g3;

    return new THREE.Vector3(g1 / g, -g3 / g - 0.5, g2 / g).multiplyScalar(this.scale);
  }

  getDomain(): SurfaceDomain {
    return { uMin: 0, uMax: 1, vMin: 0, vMax: 2 * Math.PI };
  }
}
