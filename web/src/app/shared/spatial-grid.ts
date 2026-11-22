import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { cld, srcset } from '../core/cloudinary';
import { ProductCard, formatMinor } from '../core/product.model';

/** Asymmetric product grid. Real uploaded imagery is shown; missing imagery gets an abstract, non-product placeholder. */
@Component({
  selector: 'qz-spatial-grid',
  imports: [RouterLink],
  template: `
    <ul class="spatial-products" aria-label="Products">
      @for (p of products(); track p.slug; let i = $index) {
        <li class="spatial-product-item" [class.spatial-product-featured]="i % 5 === 0">
          <a [routerLink]="['/products', p.slug]" class="product-spatial-card" (pointermove)="tilt($event)" (pointerleave)="reset($event)">
            <div class="product-visual" [class.product-visual-large]="i % 5 === 0">
              @if (p.image; as img) {
                <img [src]="cld(img.url, 960)" [attr.srcset]="srcset(img.url, [320, 640, 960])" [attr.sizes]="'(min-width: 1024px) 25vw, 50vw'" [alt]="img.alt || p.name" [attr.width]="img.width" [attr.height]="img.height"
                     loading="lazy" decoding="async" class="product-photo">
              } @else {
                <div class="product-abstract" aria-label="Product image not yet added" role="img">
                  <span class="abstract-orbit"></span><span class="abstract-block abstract-block-one"></span><span class="abstract-block abstract-block-two"></span><span class="abstract-disc"></span><span class="abstract-spark">✳</span>
                  <span class="abstract-label">IMAGE<br>COMING FROM<br>THE STUDIO</span>
                </div>
              }
              <span class="product-view" aria-hidden="true">View piece ↗</span>
            </div>
            <div class="product-card-info">
              <div><h3>{{ p.name }}</h3><p>@if (p.customisable) { <span>Made personal</span> }</p></div>
              <div class="product-card-price">@if (p.priceMinor !== null) { {{ price(p.priceMinor) }} } @else { <span class="price-pending">Price to be confirmed</span> }</div>
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
    if (e.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = e.currentTarget as HTMLElement, r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--ry', `${x * 5}deg`);
    el.style.setProperty('--rx', `${-y * 5}deg`);
  }
  reset(e: PointerEvent) {
    const el = e.currentTarget as HTMLElement;
    el.style.removeProperty('--rx'); el.style.removeProperty('--ry');
  }
}
