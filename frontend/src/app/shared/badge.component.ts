import { Component, Input } from '@angular/core';

/** Etiqueta de estado con el mismo lenguaje visual que la versión original. */
@Component({
  selector: 'app-badge',
  standalone: true,
  template: `<span class="badge badge-{{ tone }}">{{ label }}</span>`,
})
export class BadgeComponent {
  @Input({ required: true }) label!: string | number;
  @Input() tone: 'gray' | 'green' | 'amber' | 'red' | 'blue' = 'gray';
}
