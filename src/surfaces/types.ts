import * as THREE from 'three';

export interface SurfaceDomain {
  uMin: number;
  uMax: number;
  vMin: number;
  vMax: number;
}

export interface Surface {
  evaluate(u: number, v: number): THREE.Vector3;
  getDomain(): SurfaceDomain;
}

export interface SurfacePartials {
  du: THREE.Vector3;
  dv: THREE.Vector3;
}

export interface FirstFundamentalForm {
  E: number;
  F: number;
  G: number;
}

export interface DifferentialSurface extends Surface {
  computeNormal(u: number, v: number): THREE.Vector3;
  computePartials(u: number, v: number): SurfacePartials;
  computeMetric(u: number, v: number): FirstFundamentalForm;
}
