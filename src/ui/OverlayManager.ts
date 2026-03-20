import './styles/theme.css';
import './styles/overlay.css';
import { OverlaySlider, type OverlaySliderOptions } from './OverlaySlider';

export class OverlayManager {
  private container: HTMLElement;
  private controls: OverlaySlider[] = [];

  constructor(parent: HTMLElement) {
    this.container = document.createElement('div');
    this.container.className = 'cr-overlay';
    parent.appendChild(this.container);
  }

  addSlider(options: OverlaySliderOptions): OverlaySlider {
    const slider = new OverlaySlider(options);
    slider.mount(this.container);
    this.controls.push(slider);
    return slider;
  }

  dispose(): void {
    for (const c of this.controls) c.dispose();
    this.controls = [];
    this.container.remove();
  }
}
