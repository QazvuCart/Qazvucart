import { Component, input } from '@angular/core';

@Component({
  selector: 'qz-empty-catalogue',
  template: `
    <div class="rounded-2xl border-2 border-dashed border-forest/25 bg-sage-soft p-8 md:p-12 grid md:grid-cols-[auto_1fr] gap-6 items-center">
      <div class="relative w-28 h-32 shrink-0" aria-hidden="true">
        <span class="absolute inset-0 rounded bg-sage shadow-lift -rotate-6"></span>
        <span class="absolute inset-0 rounded bg-porcelain border-2 border-sage rotate-3"></span>
      </div>
      <div>
        <h3 class="text-2xl">{{ failed() ? 'The catalogue could not load' : 'No products yet' }}</h3>
        <p class="mt-2 max-w-prose">
          {{ failed() ? 'Check your connection and reload the page.' : 'Products appear here as soon as they are added from the admin dashboard.' }}
        </p>
      </div>
    </div>
  `,
})
export class EmptyCatalogue { failed = input(false); }
