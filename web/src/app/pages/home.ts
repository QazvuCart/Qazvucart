import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductCard } from '../core/product.model';
import { ProductsService } from '../core/products.service';
import { EmptyCatalogue } from '../shared/empty-catalogue';
import { SpatialGrid } from '../shared/spatial-grid';
import { Reveal, Tilt } from '../shared/motion-directives';

@Component({
  selector: 'qz-home',
  imports: [RouterLink, SpatialGrid, EmptyCatalogue, Reveal, Tilt],
  template: `
    <section class="container-qz grid md:grid-cols-[1.15fr_1fr] gap-12 items-center py-14 md:py-24">
      <div>
        <h1 class="rise text-[clamp(2.6rem,8vw,5.4rem)]">Prints for your wall. Cases for your phone.</h1>
        <p class="rise mt-6 text-lg max-w-[34rem]" style="--d: 140ms">QazvuCart sells printed wall posters and custom mobile phone cases. Pick a product, add your details, and send your order request on WhatsApp.</p>
        <div class="rise mt-8 flex flex-wrap gap-3" style="--d: 260ms">
          <a routerLink="/products" class="btn btn-primary">Browse products</a>
          <a href="#customise" class="btn btn-quiet">How customising works</a>
        </div>
      </div>
      <div class="frame-stack" aria-hidden="true"><span class="f f1"></span><span class="f f2"></span><span class="f f3"></span><i class="dot"></i></div>
    </section>

    <section class="bg-sage py-16 md:py-24 overflow-x-clip" aria-labelledby="collections">
      <div class="container-qz">
        <h2 id="collections" qzReveal class="text-3xl md:text-5xl">Two collections</h2>
        <div class="mt-10 grid md:grid-cols-[1.3fr_1fr] gap-6 md:gap-8">
          <div qzReveal="left">
            <a routerLink="/products" qzTilt="4" class="tilt glare group block rounded-3xl bg-porcelain shadow-lift p-8 md:p-10 min-h-56 no-underline text-forest">
              <h3 class="text-2xl md:text-3xl">Wall posters</h3>
              <p class="mt-3 max-w-sm">Printed posters for your walls.</p>
              <svg class="mt-8 transition-transform duration-500 group-hover:translate-x-2" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>
            </a>
          </div>
          <div qzReveal="right" [qzRevealDelay]="140" class="md:mt-10">
            <a routerLink="/products" qzTilt="4" class="tilt glare group block rounded-3xl bg-sage-soft shadow-lift p-8 md:p-10 min-h-56 no-underline text-forest">
              <h3 class="text-2xl md:text-3xl">Phone cases</h3>
              <p class="mt-3 max-w-sm">Custom cases for your phone model.</p>
              <svg class="mt-8 transition-transform duration-500 group-hover:translate-x-2" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>
            </a>
          </div>
        </div>
      </div>
    </section>

    <section class="container-qz py-16 md:py-24" aria-labelledby="featured">
      <h2 id="featured" qzReveal class="text-3xl md:text-5xl">Featured</h2>
      <div class="mt-10">
        @if (loading()) { <p>Loading products…</p> }
        @else if (featured().length) { <qz-spatial-grid [products]="featured()" /> }
        @else { <qz-empty-catalogue [failed]="failed()" /> }
      </div>
    </section>

    <section id="customise" class="bg-sage-soft py-16 md:py-24" aria-labelledby="custom-h">
      <div class="container-qz grid md:grid-cols-2 gap-10">
        <h2 id="custom-h" qzReveal class="text-3xl md:text-5xl">Make it yours</h2>
        <div class="space-y-4 text-lg">
          <p qzReveal [qzRevealDelay]="100">Some products can be customised. When a product allows it, you will see fields for your details on its page, and an option to attach your image.</p>
          <p qzReveal [qzRevealDelay]="220">Your order request opens in WhatsApp. We confirm availability, delivery charges and payment instructions with you there.</p>
        </div>
      </div>
    </section>
  `,
})
export class Home {
  private api = inject(ProductsService);
  featured = signal<ProductCard[]>([]);
  loading = signal(true);
  failed = signal(false);

  constructor() {
    this.api.list({ featured: true }).subscribe({
      next: (items) => { this.featured.set(items); this.loading.set(false); },
      error: () => { this.failed.set(true); this.loading.set(false); },
    });
  }
}
