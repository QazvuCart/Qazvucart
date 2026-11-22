import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { PublicSettings } from '../core/product.model';
import { ProductsService } from '../core/products.service';
import { Seo } from '../core/seo';

@Component({
  selector: 'qz-contact',
  template: `
    <section class="container-qz py-12 md:py-20 min-h-[50dvh]">
      <h1 class="text-4xl md:text-6xl">Contact</h1>
      <ul class="mt-8 grid gap-4 list-none p-0 max-w-xl">
        @if (s().whatsapp_number; as n) {
          <li><a class="btn btn-primary w-full" [href]="'https://wa.me/' + n" target="_blank" rel="noopener">Message on WhatsApp</a></li>
        }
        @if (safeInstagram(); as url) {
          <li><a class="btn btn-quiet w-full" [href]="url" target="_blank" rel="noopener">Instagram</a></li>
        }
        @if (s().contact_email; as e) { <li>Email: <a [href]="'mailto:' + e" class="underline underline-offset-4">{{ e }}</a></li> }
        @if (s().contact_phone; as t) { <li>Phone: <a [href]="'tel:' + t" class="underline underline-offset-4">{{ t }}</a></li> }
        @if (s().contact_address; as a) { <li class="whitespace-pre-line">{{ a }}</li> }
      </ul>
      @if (!any()) { <p class="mt-8 text-lg">Contact details have not been added yet.</p> }
    </section>
  `,
})
export class Contact {
  s = toSignal(inject(ProductsService).settings$.pipe(catchError(() => of({} as PublicSettings))), { initialValue: {} as PublicSettings });
  /** Only https links are rendered as Instagram links. */
  safeInstagram = computed(() => { const u = this.s().instagram_url ?? ''; return /^https:\/\//i.test(u) ? u : null; });
  any = computed(() => !!(this.s().whatsapp_number || this.safeInstagram() || this.s().contact_email || this.s().contact_phone || this.s().contact_address));
  constructor() { inject(Seo).set({ title: 'Contact — QazvuCart', description: 'Contact QazvuCart on WhatsApp or Instagram.', path: '/contact' }); }
}
