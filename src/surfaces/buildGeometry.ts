import * as THREE from 'three';
import type { Surface } from './types';

export interface BuildGeometryOptions {
  uMin?: number;
  uMax?: number;
  vMin?: number;
  vMax?: number;
  uSegments?: number;
  vSegments?: number;
}

export function buildGeometry(
  surface: Surface,
  options: BuildGeometryOptions = {},
): THREE.BufferGeometry {
  const domain = surface.getDomain();
  const uMin = options.uMin ?? domain.uMin;
  const uMax = options.uMax ?? domain.uMax;
  const vMin = options.vMin ?? domain.vMin;
  const vMax = options.vMax ?? domain.vMax;
  const uSegments = options.uSegments ?? 32;
  const vSegments = options.vSegments ?? 32;

  const hasNormals = 'computeNormal' in surface;

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  for (let i = 0; i <= vSegments; i++) {
    const v = vMin + (vMax - vMin) * (i / vSegments);
    for (let j = 0; j <= uSegments; j++) {
      const u = uMin + (uMax - uMin) * (j / uSegments);

      const point = surface.evaluate(u, v);
      positions.push(point.x, point.y, point.z);

      if (hasNormals) {
        const normal = (surface as any).computeNormal(u, v);
        normals.push(normal.x, normal.y, normal.z);
      }

      uvs.push(j / uSegments, i / vSegments);
    }
  }

  const indices: number[] = [];
  for (let i = 0; i < vSegments; i++) {
    for (let j = 0; j < uSegments; j++) {
      const v0 = i * (uSegments + 1) + j;
      const v1 = (i + 1) * (uSegments + 1) + j;
      const v2 = i * (uSegments + 1) + (j + 1);
      const v3 = (i + 1) * (uSegments + 1) + (j + 1);
      indices.push(v0, v2, v1);
      indices.push(v1, v2, v3);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

  if (normals.length > 0) {
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  } else {
    geometry.computeVertexNormals();
  }

  return geometry;
}
