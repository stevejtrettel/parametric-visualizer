import { Input } from './Input';

export interface OverlaySliderOptions {
  min?: number;
  max?: number;
  step?: number;
  value: number;
  label?: string;
  format?: (value: number) => string;
  onChange?: (value: number) => void;
}

export class OverlaySlider extends Input<number> {
  private input: HTMLInputElement;
  private labelEl: HTMLSpanElement;
  private format: (value: number) => string;

  constructor(options: OverlaySliderOptions) {
    super('div', 'cr-overlay-slider');
    this.onChange = options.onChange;

    const label = options.label ?? '';
    this.format = options.format ?? ((v) => `${label} = ${v.toFixed(2)}`);

    this.labelEl = document.createElement('span');
    this.labelEl.className = 'cr-overlay-slider-label';
    this.labelEl.textContent = this.format(options.value);
    this.domElement.appendChild(this.labelEl);

    this.input = document.createElement('input');
    this.input.type = 'range';
    this.input.min = (options.min ?? 0).toString();
    this.input.max = (options.max ?? 1).toString();
    this.input.step = (options.step ?? 0.01).toString();
    this.input.value = options.value.toString();
    this.input.className = 'cr-overlay-slider-input';
    this.domElement.appendChild(this.input);

    this.handleInput = () => {
      const value = parseFloat(this.input.value);
      this.labelEl.textContent = this.format(value);
      if (this.onChange) this.onChange(value);
    };
    this.input.addEventListener('input', this.handleInput);
  }

  private handleInput: () => void;

  setValue(value: number): void {
    this.input.value = value.toString();
    this.labelEl.textContent = this.format(value);
  }

  getValue(): number {
    return parseFloat(this.input.value);
  }

  dispose(): void {
    this.input.removeEventListener('input', this.handleInput);
    super.dispose();
  }
}
