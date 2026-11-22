import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Category, ProductCard } from '../core/product.model';
import { ProductsService } from '../core/products.service';
import { EmptyCatalogue } from '../shared/empty-catalogue';
import { SpatialGrid } from '../shared/spatial-grid';

@Component({
  selector: 'qz-home',
  imports: [RouterLink, SpatialGrid, EmptyCatalogue],
  template: `
    <section class="hero-shell relative overflow-hidden">
      <div class="hero-noise" aria-hidden="true"></div>
      <div class="container-qz hero-layout">
        <div class="hero-copy">
          <p class="eyebrow"><span class="eyebrow-mark"></span> A creative corner for everyday life</p>
          <h1 class="hero-title">Make room for <span>your kind</span> of things.</h1>
          <p class="hero-description">Discover printed pieces, personal touches and everyday finds. Explore the collection and make your next pick your own.</p>
          <div class="mt-8 flex flex-wrap gap-3">
            <a routerLink="/products" class="btn btn-primary hero-cta">Explore the collection <span aria-hidden="true">↗</span></a>
            <a href="#how-it-works" class="btn btn-quiet">How ordering works</a>
          </div>
          <p class="hero-note"><span class="hero-note-dot"></span> Orders and payment are coordinated directly through WhatsApp.</p>
        </div>

        <div class="hero-art-wrap" aria-label="Abstract animated three-dimensional QazvuCart artwork">
          <div class="hero-art" aria-hidden="true">
            <div class="art-orbit orbit-one"></div>
            <div class="art-orbit orbit-two"></div>
            <div class="art-orbit orbit-three"></div>
            <div class="art-disc disc-back"></div>
            <div class="art-disc disc-front"></div>
            <div class="art-cube cube-one"><i></i><b></b><em></em></div>
            <div class="art-cube cube-two"><i></i><b></b><em></em></div>
            <div class="art-cube cube-three"><i></i><b></b><em></em></div>
            <div class="art-tile tile-one"><span></span><span></span><span></span></div>
            <div class="art-tile tile-two"><span></span><span></span><span></span></div>
            <div class="art-ring"></div>
            <div class="art-sphere sphere-one"></div>
            <div class="art-sphere sphere-two"></div>
            <div class="art-spark spark-one">✳</div>
            <div class="art-spark spark-two">✳</div>
            <div class="art-caption caption-top">OBJECTS / IDEAS / YOU</div>
            <div class="art-caption caption-bottom">QZ — STUDIO 01</div>
          </div>
          <div class="hero-art-shadow" aria-hidden="true"></div>
        </div>
      </div>
      <div class="hero-bottom-line" aria-hidden="true"><span>QAZVUCART</span><span>MADE TO FEEL PERSONAL</span><span>SCROLL TO EXPLORE ↓</span></div>
    </section>

    @if (categories().length) {
      <section class="category-section" aria-labelledby="collections">
        <div class="container-qz py-16 md:py-24">
          <div class="section-heading-row">
            <div><p class="eyebrow">FIND YOUR CORNER</p><h2 id="collections" class="section-title">Explore collections<span class="title-period">.</span></h2></div>
            <a routerLink="/products" class="text-link">View all products <span aria-hidden="true">↗</span></a>
          </div>
          <div class="category-grid mt-10">
            @for (c of categories(); track c.slug; let i = $index) {
              <a [routerLink]="['/categories', c.slug]" class="category-card" [class]="'category-card category-tone-' + (i % 4)">
                <div class="category-art" aria-hidden="true">
                  <span class="category-shape shape-a"></span><span class="category-shape shape-b"></span><span class="category-shape shape-c"></span>
                  <span class="category-index">0{{ i + 1 }}</span>
                </div>
                <div class="category-meta"><div><h3>{{ c.name }}</h3>@if (c.description) { <p>{{ c.description }}</p> }</div><span class="category-arrow" aria-hidden="true">↗</span></div>
              </a>
            }
          </div>
        </div>
      </section>
    }

    <section class="featured-section container-qz py-16 md:py-24" aria-labelledby="featured">
      <div class="section-heading-row">
        <div><p class="eyebrow">SELECTED FOR YOU</p><h2 id="featured" class="section-title">Featured pieces<span class="title-period">.</span></h2></div>
        <a routerLink="/products" class="text-link">Browse everything <span aria-hidden="true">↗</span></a>
      </div>
      <div class="mt-10" [attr.aria-busy]="loading()">
        @if (loading()) {
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6" aria-label="Loading featured products">
            @for (i of [1, 2, 3, 4]; track i) { <div class="skeleton-card"><div class="skeleton-art"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></div> }
          </div>
        } @else if (featured().length) { <qz-spatial-grid [products]="featured()" /> }
        @else { <qz-empty-catalogue [failed]="failed()" /> }
      </div>
    </section>

    <section id="how-it-works" class="order-section">
      <div class="container-qz py-16 md:py-24">
        <div class="order-intro"><p class="eyebrow">SIMPLE BY DESIGN</p><h2 class="section-title">A personal order,<br><span>without the fuss.</span></h2><p>Choose a product, share what you need and continue the conversation with us on WhatsApp. We confirm the details, delivery charges and payment instructions with you directly.</p></div>
        <div class="order-steps">
          <article><span class="step-no">01</span><div class="step-icon">↗</div><h3>Explore</h3><p>Find a product and choose its available options.</p></article>
          <article><span class="step-no">02</span><div class="step-icon">✳</div><h3>Personalise</h3><p>Add the details or customisation you want.</p></article>
          <article><span class="step-no">03</span><div class="step-icon">↗</div><h3>Message us</h3><p>Send your order request through WhatsApp. We confirm it with you there.</p></article>
        </div>
      </div>
    </section>
  `,
})
export class Home {
  private api = inject(ProductsService);
  featured = signal<ProductCard[]>([]);
  categories = signal<Category[]>([]);
  loading = signal(true);
  failed = signal(false);

  constructor() {
    this.api.categories().subscribe({ next: (items) => this.categories.set(items), error: () => this.categories.set([]) });
    this.api.list({ featured: true }).subscribe({
      next: (items) => { this.featured.set(items); this.loading.set(false); },
      error: () => { this.failed.set(true); this.loading.set(false); },
    });
  }
}
