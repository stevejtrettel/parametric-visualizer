import type { Params } from './Params';

// ── Lifecycle ──

export interface Rebuildable {
  rebuild(): void;
}

export interface Updatable {
  update(): void;
}

export interface Parametric {
  readonly params: Params;
}

// ── Params ──

export type ParamTrigger = 'rebuild' | 'update' | 'none';

export interface ParamOptions {
  triggers?: ParamTrigger;
  onChange?: (value: any) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}

export interface ParamDefinition {
  name: string;
  defaultValue: any;
  options: ParamOptions;
}

// ── App ──

export type AnimateCallback = (time: number, delta: number) => void;

export interface AppOptions {
  fov?: number;
  near?: number;
  far?: number;
  antialias?: boolean;
  toneMapping?: 'none' | 'aces' | 'reinhard' | 'cineon' | 'neutral';
  toneMappingExposure?: number;
  debug?: boolean;
}
