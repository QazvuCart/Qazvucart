import { Component, computed, effect, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { paragraphs } from '../core/page-text';
import { PublicSettings } from '../core/product.model';
import { ProductsService } from '../core/products.service';
import { Seo } from '../core/seo';
import { NotFound } from './not-found';

const POLICIES: Record<string, { title: string; key: keyof PublicSettings }> = {
  shipping: { title: 'Shipping policy', key: 'policy_shipping' },
  returns: { title: 'Returns and refunds policy', key: 'policy_returns' },
  privacy: { title: 'Privacy policy', key: 'policy_privacy' },
  terms: { title: 'Terms and conditions', key: 'policy_terms' },
};

@Component({
  selector: 'qz-policy',
  imports: [NotFound],
  template: `
    @if (policy(); as p) {
      <section class="container-qz py-12 md:py-20 min-h-[50dvh]">
        <h1 class="text-4xl md:text-6xl">{{ p.title }}</h1>
        <div class="mt-8 max-w-prose space-y-4 text-lg">
          @for (t of text(); track $index) { <p>{{ t }}</p> }
          @empty {
            <p class="rounded-xl bg-sage-soft p-5"><strong>Draft.</strong> This policy has not been written yet. QazvuCart must add its own policy here before it is relied on.</p>
          }
        </div>
      </section>
    } @else { <qz-not-found /> }
  `,
})
export class Policy {
  slug = input.required<string>();
  private settings = toSignal(inject(ProductsService).settings$.pipe(catchError(() => of({} as PublicSettings))), { initialValue: {} as PublicSettings });
  policy = computed(() => POLICIES[this.slug()] ?? null);
  text = computed(() => { const p = this.policy(); return p ? paragraphs(this.settings()[p.key]) : []; });
  constructor() {
    const seo = inject(Seo);
    effect(() => seo.set({
      title: `${this.policy()?.title ?? 'Policies'} — QazvuCart`,
      description: 'QazvuCart store policies.',
      path: '/policies/' + encodeURIComponent(this.slug()),
    }));
  }
}
