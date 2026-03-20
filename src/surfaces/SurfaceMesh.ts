import * as THREE from 'three';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';
import { Params } from '../core/Params';
import type { Surface, DifferentialSurface, SurfaceDomain, SurfacePartials, FirstFundamentalForm } from './types';
import { buildGeometry } from './buildGeometry';

export interface SurfaceMeshOptions {
  uSegments?: number;
  vSegments?: number;
  color?: number;
  roughness?: number;
  metalness?: number;
  transmission?: number;
  wireframe?: boolean;
  fragmentShader?: string;
  vertexShader?: string;
  uniforms?: Record<string, { value: any }>;
}

export class SurfaceMesh extends THREE.Mesh {
  readonly params = new Params(this);

  private surface: Surface;
  uniforms: Record<string, { value: any }>;

  // Reactive properties — created at runtime by Params.define() via Object.defineProperty.
  // `declare` provides type info without emitting initializers that would shadow them.
  declare uSegments: number;
  declare vSegments: number;
  declare color: number;
  declare roughness: number;
  declare metalness: number;
  declare transmission: number;
  declare wireframe: boolean;

  constructor(surface: Surface, options: SurfaceMeshOptions = {}) {
    super();

    this.surface = surface;
    this.uniforms = options.uniforms ?? {};

    this.params
      .define('uSegments', options.uSegments ?? 32, { triggers: 'rebuild' })
      .define('vSegments', options.vSegments ?? 32, { triggers: 'rebuild' })
      .define('color', options.color ?? 0x4488ff, { triggers: 'update' })
      .define('roughness', options.roughness ?? 0.3, { triggers: 'update' })
      .define('metalness', options.metalness ?? 0.1, { triggers: 'update' })
      .define('transmission', options.transmission ?? 0, { triggers: 'update' })
      .define('wireframe', options.wireframe ?? false, { triggers: 'update' })
      .dependOn(surface);

    if (options.fragmentShader || options.vertexShader) {
      const uvEnableTexture = new THREE.DataTexture(
        new Uint8Array([255, 255, 255, 255]), 1, 1,
      );
      uvEnableTexture.needsUpdate = true;

      this.material = new CustomShaderMaterial({
        baseMaterial: THREE.MeshPhysicalMaterial,
        vertexShader: options.vertexShader,
        fragmentShader: options.fragmentShader,
        uniforms: this.uniforms,
        side: THREE.DoubleSide,
        map: uvEnableTexture,
      });
    } else {
      this.material = new THREE.MeshPhysicalMaterial({
        side: THREE.DoubleSide,
      });
    }

    this.rebuild();
    this.update();
  }

  rebuild(): void {
    if (this.geometry) this.geometry.dispose();
    this.geometry = buildGeometry(this.surface, {
      uSegments: this.uSegments,
      vSegments: this.vSegments,
    });
  }

  update(): void {
    const mat = this.material as THREE.MeshPhysicalMaterial;
    mat.color.set(this.color);
    mat.roughness = this.roughness;
    mat.metalness = this.metalness;
    mat.transmission = this.transmission;
    mat.wireframe = this.wireframe;
    mat.needsUpdate = true;
  }

  setShader(options: {
    fragmentShader: string;
    vertexShader?: string;
    uniforms: Record<string, { value: any }>;
  }): void {
    (this.material as THREE.Material).dispose();
    this.uniforms = options.uniforms;

    const uvTex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    uvTex.needsUpdate = true;

    this.material = new CustomShaderMaterial({
      baseMaterial: THREE.MeshPhysicalMaterial,
      fragmentShader: options.fragmentShader,
      vertexShader: options.vertexShader,
      uniforms: options.uniforms,
      side: THREE.DoubleSide,
      map: uvTex,
    });
    this.update();
  }

  dispose(): void {
    if (this.geometry) this.geometry.dispose();
    if (this.material) (this.material as THREE.Material).dispose();
    this.params.dispose();
  }

  static fromFunction(
    fn: (x: number, y: number) => number,
    options: SurfaceMeshOptions & { domain?: [number, number, number, number] } = {},
  ): SurfaceMesh {
    const { domain = [-2, 2, -2, 2], ...meshOptions } = options;
    const [xMin, xMax, yMin, yMax] = domain;

    const surface: DifferentialSurface = {
      evaluate(u: number, v: number): THREE.Vector3 {
        return new THREE.Vector3(u, v, fn(u, v));
      },
      getDomain(): SurfaceDomain {
        return { uMin: xMin, uMax: xMax, vMin: yMin, vMax: yMax };
      },
      computePartials(u: number, v: number): SurfacePartials {
        const h = 0.0001;
        const fu = (fn(u + h, v) - fn(u - h, v)) / (2 * h);
        const fv = (fn(u, v + h) - fn(u, v - h)) / (2 * h);
        return {
          du: new THREE.Vector3(1, 0, fu),
          dv: new THREE.Vector3(0, 1, fv),
        };
      },
      computeNormal(u: number, v: number): THREE.Vector3 {
        const { du, dv } = this.computePartials(u, v);
        return du.cross(dv).normalize();
      },
      computeMetric(u: number, v: number): FirstFundamentalForm {
        const { du, dv } = this.computePartials(u, v);
        return { E: du.dot(du), F: du.dot(dv), G: dv.dot(dv) };
      },
    };

    return new SurfaceMesh(surface, meshOptions);
  }
}
