import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { cld, srcset } from '../core/cloudinary';
import { ProductCard, formatMinor } from '../core/product.model';
import { ShareService } from '../core/share';
import { Reveal } from './motion-directives';

/**
 * Compact spatial product grid: 2 / 3 / 5 columns, squarer cards (about 20% shorter than before) with a floating
 * glass label that overlaps the photo. Cards ease in on scroll and tilt under a mouse. Only renders what it is given.
 */
@Component({
  selector: 'qz-spatial-grid',
  imports: [RouterLink, Reveal],
  template: `
    <ul class="sg">
      @for (p of products(); track p.slug; let i = $index) {
        <li class="sg-item" qzReveal [qzRevealDelay]="(i % 5) * 70">
          <a [routerLink]="['/products', p.slug]" class="sg-card tilt" (pointermove)="tilt($event)" (pointerleave)="reset($event)">
            <div class="sg-media">
              @if (p.image; as img) {
                <img [src]="cld(img.url, 480)" [attr.srcset]="srcset(img.url, [240, 480, 720])" [attr.sizes]="'(min-width: 1024px) 13rem, (min-width: 640px) 30vw, 46vw'"
                     [alt]="img.alt" [attr.width]="img.width" [attr.height]="img.height" loading="lazy" decoding="async">
              } @else {
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="opacity-40" role="img" aria-label="No image yet">
                  <rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 18l5-5 4 4 3-3 4 4"/>
                </svg>
              }
            </div>
            <div class="sg-info">
              <h3 class="sg-name">{{ p.name }}</h3>
              <p class="sg-meta">
                @if (p.priceMinor !== null) { <span class="sg-price">{{ price(p.priceMinor) }}</span> }
                @else { <span>Price soon</span> }
                @if (p.customisable) { <span class="sg-tag">Custom</span> }
              </p>
            </div>
          </a>
          <button type="button" class="sg-share" (click)="share(p)" [attr.aria-label]="'Share ' + p.name">
            <span aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="M8.3 10.8l7.4-4.6M8.3 13.2l7.4 4.6"/></svg>
            </span>
          </button>
        </li>
      }
    </ul>
  `,
})
export class SpatialGrid {
  private shareSvc = inject(ShareService);
  products = input.required<ProductCard[]>();
  price = formatMinor;
  cld = cld;
  srcset = srcset;

  share(p: ProductCard) { this.shareSvc.quick(`${p.name} — QazvuCart`, `/products/${encodeURIComponent(p.slug)}`); }

  tilt(e: PointerEvent) {
    if (e.pointerType !== 'mouse') return; // no tilt on touch
    const el = e.currentTarget as HTMLElement, r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--ry', `${x * 7}deg`);
    el.style.setProperty('--rx', `${-y * 7}deg`);
  }
  reset(e: PointerEvent) {
    const el = e.currentTarget as HTMLElement;
    el.style.removeProperty('--rx'); el.style.removeProperty('--ry');
  }
}
