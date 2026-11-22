import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'qz-footer',
  imports: [RouterLink],
  template: `
    <footer class="bg-forest text-porcelain mt-24">
      <div class="container-qz py-12 grid gap-10 md:grid-cols-[1.4fr_1fr]">
        <div>
          <p class="font-display text-3xl font-bold">QazvuCart</p>
          <p class="mt-3 max-w-md text-porcelain/80">A creative collection of printed pieces, personalised details and everyday finds. Order requests and payment coordination happen directly through WhatsApp.</p>
        </div>
        <nav aria-label="Policies" class="flex flex-col">
          @for (p of policies; track p.slug) {
            <a [routerLink]="['/policies', p.slug]" class="min-h-11 flex items-center text-porcelain no-underline hover:underline">{{ p.label }}</a>
          }
        </nav>
      </div>
    </footer>
  `,
})
export class Footer {
  policies = [
    { slug: 'shipping', label: 'Shipping policy' },
    { slug: 'returns', label: 'Returns and refunds' },
    { slug: 'privacy', label: 'Privacy policy' },
    { slug: 'terms', label: 'Terms and conditions' },
  ];
}
