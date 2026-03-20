export abstract class Input<T> {
  readonly domElement: HTMLElement;
  onChange?: (value: T) => void;

  constructor(tag: string, className?: string) {
    this.domElement = document.createElement(tag);
    if (className) this.domElement.className = className;
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this.domElement);
  }

  unmount(): void {
    this.domElement.remove();
  }

  abstract setValue(value: T): void;
  abstract getValue(): T;

  dispose(): void {
    this.unmount();
  }
}
