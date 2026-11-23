import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { cld, srcset } from '../core/cloudinary';
import { ProductCard, formatMinor } from '../core/product.model';
import { Reveal } from './motion-directives';

/** Compact product grid: equal-sized cards, 2 / 3 / 4 columns. Cards ease in on scroll and tilt under a mouse. Only renders what it is given. */
@Component({
  selector: 'qz-spatial-grid',
  imports: [RouterLink, Reveal],
  template: `
    <ul class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5 list-none p-0 m-0">
      @for (p of products(); track p.slug; let i = $index) {
        <li qzReveal [qzRevealDelay]="(i % 4) * 110">
          <a [routerLink]="['/products', p.slug]" class="tilt block h-full rounded-2xl bg-sage shadow-lift overflow-hidden no-underline text-forest"
             (pointermove)="tilt($event)" (pointerleave)="reset($event)">
            <div class="bg-sage-soft grid place-items-center aspect-[4/5]">
              @if (p.image; as img) {
                <img [src]="cld(img.url, 640)" [attr.srcset]="srcset(img.url, [320, 640, 960])" [attr.sizes]="'(min-width: 1024px) 16rem, (min-width: 768px) 30vw, 50vw'" [alt]="img.alt" [attr.width]="img.width" [attr.height]="img.height"
                     loading="lazy" decoding="async" class="size-full object-contain">
              } @else {
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="opacity-40" role="img" aria-label="No image yet">
                  <rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 18l5-5 4 4 3-3 4 4"/>
                </svg>
              }
            </div>
            <div class="p-3 md:p-4">
              <h3 class="text-sm md:text-base">{{ p.name }}</h3>
              <p class="mt-1 text-xs md:text-sm">
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
