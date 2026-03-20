/**
 * SlicedSurface — convenience factory for creating a sliced surface with
 * a glass overlay, correctly wired with render ordering.
 */

import * as THREE from 'three';
import { SurfaceMesh } from '../surfaces/SurfaceMesh';
import type { Surface } from '../surfaces/types';
import type { SurfaceShaderResult } from './SurfaceShader';

export interface SlicedSurfaceOptions {
  uSegments?: number;
  vSegments?: number;
  roughness?: number;
  metalness?: number;
  glassTransmission?: number;
  glassColor?: number;
}

export interface SlicedSurfaceResult {
  mesh: SurfaceMesh;
  glass: SurfaceMesh;
  addTo(parent: THREE.Object3D): void;
  dispose(): void;
}

export function createSlicedSurface(
  surface: Surface,
  shader: SurfaceShaderResult,
  options: SlicedSurfaceOptions = {},
): SlicedSurfaceResult {
  const {
    uSegments = 64,
    vSegments = 128,
    roughness = 0.4,
    metalness = 0.1,
    glassTransmission = 0.95,
    glassColor = 0xc9eaff,
  } = options;

  const mesh = new SurfaceMesh(surface, {
    ...shader,
    uSegments,
    vSegments,
    roughness,
    metalness,
  });

  const glass = new SurfaceMesh(surface, {
    uSegments,
    vSegments,
    transmission: glassTransmission,
    roughness: 0,
    metalness: 0,
    color: glassColor,
  });

  glass.renderOrder = 0;
  (glass.material as THREE.Material).polygonOffset = true;
  (glass.material as THREE.Material).polygonOffsetFactor = 1;
  (glass.material as THREE.Material).polygonOffsetUnits = 1;
  mesh.renderOrder = 1;

  return {
    mesh,
    glass,
    addTo(parent: THREE.Object3D) {
      parent.add(mesh);
      parent.add(glass);
    },
    dispose() {
      mesh.dispose();
      glass.dispose();
    },
  };
}
