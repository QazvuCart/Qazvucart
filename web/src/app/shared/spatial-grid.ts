import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { cld, srcset } from '../core/cloudinary';
import { ProductCard, formatMinor } from '../core/product.model';

/** Asymmetric bento grid: every fifth card is large. Only renders what it is given. */
@Component({
  selector: 'qz-spatial-grid',
  imports: [RouterLink],
  template: `
    <ul class="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 [grid-auto-flow:dense] list-none p-0 m-0">
      @for (p of products(); track p.slug; let i = $index) {
        <li [class]="i % 5 === 0 ? 'col-span-2 row-span-2' : ''">
          <a [routerLink]="['/products', p.slug]" class="tilt block h-full rounded-2xl bg-sage shadow-lift overflow-hidden no-underline text-forest"
             (pointermove)="tilt($event)" (pointerleave)="reset($event)">
            <div class="bg-sage-soft grid place-items-center" [class]="i % 5 === 0 ? 'aspect-[4/3] md:aspect-[5/4]' : 'aspect-[4/5]'">
              @if (p.image; as img) {
                <img [src]="cld(img.url, 640)" [attr.srcset]="srcset(img.url, [320, 640, 960])" [attr.sizes]="'(min-width: 1024px) 25vw, 50vw'" [alt]="img.alt" [attr.width]="img.width" [attr.height]="img.height"
                     loading="lazy" decoding="async" class="size-full object-cover">
              } @else {
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="opacity-40" role="img" aria-label="No image yet">
                  <rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 18l5-5 4 4 3-3 4 4"/>
                </svg>
              }
            </div>
            <div class="p-4">
              <h3 class="text-base md:text-lg">{{ p.name }}</h3>
              <p class="mt-1 text-sm">
                @if (p.priceMinor !== null) { <span class="font-semibold">{{ price(p.priceMinor) }}</span> }
                @else { <span>Price not set yet</span> }
                @if (p.customisable) { <span class="block">Customisable</span> }
              </p>
            </div>
          </a>
        </li>
      }
    </ul>
  `,
})
export class SpatialGrid {
  products = input.required<ProductCard[]>();
  price = formatMinor;
  cld = cld;
  srcset = srcset;

  tilt(e: PointerEvent) {
    if (e.pointerType !== 'mouse') return; // no tilt on touch
    const el = e.currentTarget as HTMLElement, r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--ry', `${x * 6}deg`);
    el.style.setProperty('--rx', `${-y * 6}deg`);
  }
  reset(e: PointerEvent) {
    const el = e.currentTarget as HTMLElement;
    el.style.removeProperty('--rx'); el.style.removeProperty('--ry');
  }
}
