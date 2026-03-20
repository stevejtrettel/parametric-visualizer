// Core
export { App } from './core/App';
export type { AppOptions, AnimateCallback } from './core/types';
export { Params } from './core/Params';

// Surfaces
export { SurfaceMesh } from './surfaces/SurfaceMesh';
export type { SurfaceMeshOptions } from './surfaces/SurfaceMesh';
export { buildGeometry } from './surfaces/buildGeometry';
export type { BuildGeometryOptions } from './surfaces/buildGeometry';
export type { Surface, DifferentialSurface, SurfaceDomain, SurfacePartials, FirstFundamentalForm } from './surfaces/types';
export { Torus } from './surfaces/Torus';
export { BoysSurface } from './surfaces/BoysSurface';
export { KleinBottle } from './surfaces/KleinBottle';

// Shaders
export { createSurfaceShader } from './shaders/SurfaceShader';
export type { SurfaceShaderOptions, SurfaceShaderResult } from './shaders/SurfaceShader';
export { createSlicedSurface } from './shaders/SlicedSurface';
export type { SlicedSurfaceOptions, SlicedSurfaceResult } from './shaders/SlicedSurface';

// Math
export * from './math/complex';
