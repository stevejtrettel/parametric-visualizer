import * as THREE from 'three';
import { Params } from '../core/Params';
import type { DifferentialSurface, SurfaceDomain, SurfacePartials, FirstFundamentalForm } from './types';

export class Torus implements DifferentialSurface {
  readonly params = new Params(this);

  // Reactive properties — created at runtime by Params.define() via Object.defineProperty.
  declare R: number;
  declare r: number;

  constructor(options: { R: number; r: number }) {
    this.params.define('R', options.R, { triggers: 'rebuild' });
    this.params.define('r', options.r, { triggers: 'rebuild' });
  }

  evaluate(u: number, v: number): THREE.Vector3 {
    const bigRadius = this.R + this.r * Math.cos(v);
    return new THREE.Vector3(
      bigRadius * Math.cos(u),
      bigRadius * Math.sin(u),
      this.r * Math.sin(v),
    );
  }

  getDomain(): SurfaceDomain {
    return { uMin: 0, uMax: 2 * Math.PI, vMin: 0, vMax: 2 * Math.PI };
  }

  computePartials(u: number, v: number): SurfacePartials {
    const bigRadius = this.R + this.r * Math.cos(v);
    return {
      du: new THREE.Vector3(-bigRadius * Math.sin(u), bigRadius * Math.cos(u), 0),
      dv: new THREE.Vector3(
        -this.r * Math.sin(v) * Math.cos(u),
        -this.r * Math.sin(v) * Math.sin(u),
        this.r * Math.cos(v),
      ),
    };
  }

  computeNormal(u: number, v: number): THREE.Vector3 {
    const { du, dv } = this.computePartials(u, v);
    return du.cross(dv).normalize();
  }

  computeMetric(u: number, v: number): FirstFundamentalForm {
    const { du, dv } = this.computePartials(u, v);
    return { E: du.dot(du), F: du.dot(dv), G: dv.dot(dv) };
  }
}
