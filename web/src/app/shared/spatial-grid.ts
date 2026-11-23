import { Component, DestroyRef, ElementRef, afterNextRender, inject, input, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { cld, srcset } from '../core/cloudinary';
import { ProductCard, formatMinor } from '../core/product.model';
import { createSpatialGrid } from './motion';
import { Tilt } from './motion-directives';

/**
 * Curved spatial gallery: three columns (two on phones) bent around the viewer in 3D.
 * Cards roll through the viewport with depth, tilt, parallax and fade (see motion.ts), and arrive
 * with a staggered entrance. Only renders what it is given. Styles live in styles.css (.sg-*).
 */
@Component({
  selector: 'qz-spatial-grid',
  imports: [RouterLink, Tilt],
  host: { class: 'block' },
  template: `
    <div class="sg-stage">
      <ul #ul class="sg" role="list">
        @for (p of products(); track p.slug; let i = $index) {
          <li class="sg-item">
            <a class="sg-card" [routerLink]="['/products', p.slug]">
              <div class="sg-face tilt glare" qzTilt="5">
                <span class="sg-idx" aria-hidden="true">{{ no(i) }}</span>
                <div class="sg-media" [style.aspect-ratio]="p.image ? ratio(p.image) : null">
                  @if (p.image; as img) {
                    <img [src]="cld(img.url, 640)" [attr.srcset]="srcset(img.url, [320, 640, 960])" [attr.sizes]="'(min-width: 1024px) 24rem, 33vw'"
                         [alt]="img.alt" [attr.width]="img.width" [attr.height]="img.height" loading="lazy" decoding="async">
                  } @else {
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="opacity-40" role="img" aria-label="No image yet">
                      <rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 18l5-5 4 4 3-3 4 4"/>
                    </svg>
                  }
                </div>
                <div class="sg-meta">
                  <div>
                    <h3 class="sg-name">{{ p.name }}</h3>
                    @if (p.customisable) { <span class="sg-sub">Customisable</span> }
                  </div>
                  @if (p.priceMinor !== null) { <span class="sg-price">{{ price(p.priceMinor) }}</span> }
                  @else { <span class="sg-sub">Price not set yet</span> }
                </div>
                <span class="sg-sheen" aria-hidden="true"></span>
              </div>
            </a>
          </li>
        }
      </ul>
    </div>
  `,
})
export class SpatialGrid {
  products = input.required<ProductCard[]>();
  private ul = viewChild.required<ElementRef<HTMLElement>>('ul');
  price = formatMinor;
  cld = cld;
  srcset = srcset;

  constructor() {
    let stop = () => {};
    afterNextRender(() => { stop = createSpatialGrid(this.ul().nativeElement); });
    inject(DestroyRef).onDestroy(() => stop());
  }

  /** Card media keeps the photo's own proportions (limited to a sensible range) and the image is letterboxed, never cropped. */
  ratio(img: { width: number | null; height: number | null }) {
    const r = img.width && img.height ? img.width / img.height : 0.8;
    return Math.min(1.35, Math.max(0.62, r)).toFixed(3);
  }

  no(i: number) { return String(i + 1).padStart(2, '0'); }
}
