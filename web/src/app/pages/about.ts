import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { paragraphs } from '../core/page-text';
import { PublicSettings } from '../core/product.model';
import { ProductsService } from '../core/products.service';
import { Seo } from '../core/seo';

@Component({
  selector: 'qz-about',
  template: `
    <section class="container-qz py-12 md:py-20 min-h-[50dvh]">
      <h1 class="text-4xl md:text-6xl">About QazvuCart</h1>
      <div class="mt-8 max-w-prose space-y-4 text-lg">
        @for (p of text(); track $index) { <p>{{ p }}</p> }
        @empty { <p>QazvuCart sells printed wall posters and custom mobile phone cases. More about the brand will be added here.</p> }
      </div>
    </section>
  `,
})
export class About {
  private settings = toSignal(inject(ProductsService).settings$.pipe(catchError(() => of({} as PublicSettings))), { initialValue: {} as PublicSettings });
  text = computed(() => paragraphs(this.settings().about_content));
  constructor() { inject(Seo).set({ title: 'About — QazvuCart', description: 'About the QazvuCart brand.', path: '/about' }); }
}
