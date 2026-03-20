import * as THREE from 'three';
import type { Surface, SurfaceDomain } from '@/surfaces/types';

const PI = Math.PI;

/**
 * Klein bottle — a non-orientable closed surface with no boundary.
 *
 * Classical segmented immersion with u twisted by v/4 so that
 * cutting along u = const extracts Möbius strips.
 *
 * Domain: u ∈ [0, 2π], v ∈ [0, 4π]
 */
export class KleinBottle implements Surface {
  private readonly scale: number;

  constructor(options?: { scale?: number }) {
    this.scale = options?.scale ?? 0.4;
  }

  evaluate(u: number, v: number): THREE.Vector3 {
    const ut = u + v / 4;
    let x: number, y: number, z: number;

    if (v < PI) {
      x = (2.5 - 1.5 * Math.cos(v)) * Math.cos(ut);
      y = (2.5 - 1.5 * Math.cos(v)) * Math.sin(ut);
      z = -2.5 * Math.sin(v);
    } else if (v < 2 * PI) {
      x = (2.5 - 1.5 * Math.cos(v)) * Math.cos(ut);
      y = (2.5 - 1.5 * Math.cos(v)) * Math.sin(ut);
      z = 3 * v - 3 * PI;
    } else if (v < 3 * PI) {
      x = -2 + (2 + Math.cos(ut)) * Math.cos(v);
      y = Math.sin(ut);
      z = (2 + Math.cos(ut)) * Math.sin(v) + 3 * PI;
    } else {
      x = -2 + 2 * Math.cos(v) - Math.cos(ut);
      y = Math.sin(ut);
      z = -3 * v + 12 * PI;
    }

    return new THREE.Vector3(x, z - 4, y).multiplyScalar(this.scale);
  }

  getDomain(): SurfaceDomain {
    return { uMin: 0, uMax: 2 * PI, vMin: 0, vMax: 4 * PI };
  }
}
