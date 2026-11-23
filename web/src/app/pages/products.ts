import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { Seo } from '../core/seo';
import { ProductCard } from '../core/product.model';
import { ProductsService } from '../core/products.service';
import { EmptyCatalogue } from '../shared/empty-catalogue';
import { SpatialGrid } from '../shared/spatial-grid';
import { InView, Reveal } from '../shared/motion-directives';
import { ShareButton } from '../shared/share-button';

type State = { status: 'loading' | 'ok' | 'error'; items: ProductCard[] };

/** Serves /products (filters in the query string) and /categories/:slug. */
@Component({
  selector: 'qz-products',
  imports: [RouterLink, SpatialGrid, EmptyCatalogue, InView, Reveal, ShareButton],
  template: `
    <section class="container-qz py-6 md:py-12">
      <h1 class="text-3xl md:text-5xl">{{ heading() }}</h1>

      <div class="mt-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <form role="search" (submit)="search($event, s.value)" class="flex gap-2 md:w-96">
          <label for="q" class="sr-only">Search products</label>
          <input #s id="q" type="search" [value]="q() ?? ''" placeholder="Search products" maxlength="80"
                 class="min-h-12 flex-1 rounded-xl border-2 border-forest/30 bg-porcelain px-4">
          <button class="btn btn-quiet" type="submit">Search</button>
        </form>
        <div>
          <label for="sort" class="block text-sm font-medium">Sort by</label>
          <select id="sort" (change)="sortBy($any($event.target).value)" class="min-h-12 rounded-xl border-2 border-forest/30 bg-porcelain px-3">
            <option value="newest" [selected]="sort() === 'newest'">Newest</option>
            <option value="price-asc" [selected]="sort() === 'price-asc'">Price: low to high</option>
            <option value="price-desc" [selected]="sort() === 'price-desc'">Price: high to low</option>
          </select>
        </div>
      </div>

      @if (categories().length) {
        <nav class="mt-4 -mx-5 px-5 flex gap-2 overflow-x-auto md:mx-0 md:px-0 md:flex-wrap" aria-label="Categories">
          <a routerLink="/products" [queryParams]="{ category: null }" queryParamsHandling="merge" [class]="chip(!activeCategory())"
             [attr.aria-current]="!activeCategory() ? 'true' : null">All</a>
          @for (c of categories(); track c.slug) {
            <a routerLink="/products" [queryParams]="{ category: c.slug }" queryParamsHandling="merge" [class]="chip(activeCategory() === c.slug)"
               [attr.aria-current]="activeCategory() === c.slug ? 'true' : null">{{ c.name }}</a>
          }
        </nav>
      }

      <div class="mt-6" [attr.aria-busy]="state().status === 'loading'">
        @switch (state().status) {
          @case ('loading') {
            <div class="sg">
              @for (i of [1, 2, 3, 4, 5, 6]; track i) { <div class="aspect-square rounded-3xl bg-sage-soft animate-pulse"></div> }
            </div>
          }
          @case ('error') { <qz-empty-catalogue [failed]="true" /> }
          @default {
            @if (state().items.length) {
              <qz-spatial-grid [products]="visible()" />
              @if (hasMore()) {
                <!-- Loads the next batch before the visitor reaches the bottom, so the list just keeps going. -->
                <div qzInView (inView)="more()" class="h-20 grid place-items-center" aria-hidden="true"><span class="sg-dots"><i></i><i></i><i></i></span></div>
              } @else if (state().items.length > 4) {
                <div qzReveal class="mt-10 rounded-3xl bg-sage-soft p-6 md:p-8 text-center">
                  <h2 class="text-xl md:text-2xl">That's everything for now</h2>
                  <p class="mt-1 text-sm">Know someone who'd love these? Send them the link.</p>
                  <div class="mt-4 flex flex-wrap justify-center gap-3">
                    <qz-share [path]="sharePath()" [title]="heading()" />
                    <button type="button" class="btn btn-quiet btn-sm" (click)="top()">Back to top</button>
                  </div>
                </div>
              }
            }
            @else if (filtered()) {
              <div class="rounded-2xl bg-sage-soft p-8">
                <h2 class="text-2xl">No products match</h2>
                <p class="mt-2">Try a different search or category.</p>
                <a routerLink="/products" class="btn btn-quiet mt-5">Clear filters</a>
              </div>
            } @else { <qz-empty-catalogue /> }
          }
        }
      </div>
    </section>
  `,
})
export class Products {
  private api = inject(ProductsService);
  private router = inject(Router);

  // Bound from the query string and the :slug route parameter.
  q = input<string>();
  category = input<string>();
  sort = input<string>('newest');
  slug = input<string>();

  activeCategory = computed(() => this.slug() ?? this.category() ?? '');
  filtered = computed(() => !!(this.q() || this.activeCategory()));

  categories = toSignal(this.api.categories().pipe(catchError(() => of([]))), { initialValue: [] });
  heading = computed(() => this.categories().find((c) => c.slug === this.activeCategory())?.name ?? 'Products');

  state = toSignal(
    toObservable(computed(() => ({ q: this.q(), category: this.activeCategory(), sort: this.sort() }))).pipe(
      switchMap((p) => this.api.list(p).pipe(
        map((items): State => ({ status: 'ok', items })),
        startWith<State>({ status: 'loading', items: [] }),
        catchError(() => of<State>({ status: 'error', items: [] })),
      )),
    ),
    { initialValue: { status: 'loading', items: [] } as State },
  );

  /** Products drawn so far. Grows as the visitor scrolls; resets whenever the filters change the list. */
  private shown = signal(10);
  visible = computed(() => this.state().items.slice(0, this.shown()));
  hasMore = computed(() => this.shown() < this.state().items.length);
  sharePath = computed(() => {
    const qs = new URLSearchParams();
    if (this.q()) qs.set('q', this.q()!);
    if (this.sort() && this.sort() !== 'newest') qs.set('sort', this.sort());
    const c = this.activeCategory();
    const tail = qs.toString();
    return (c ? `/categories/${encodeURIComponent(c)}` : '/products') + (tail ? `?${tail}` : '');
  });
  more() { this.shown.update((n) => n + 10); }
  top() { scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }

  constructor() {
    effect(() => { this.state(); untracked(() => this.shown.set(10)); });
    const seo = inject(Seo);
    seo.set({ title: 'Products — QazvuCart', description: 'Browse QazvuCart wall posters and custom mobile phone cases.', path: '/products' });
  }

  chip(active: boolean) {
    return 'min-h-11 shrink-0 inline-flex items-center rounded-full px-4 no-underline font-medium border-2 transition-colors duration-300 ' +
      (active ? 'bg-tangerine border-tangerine text-forest' : 'border-forest/30 text-forest hover:bg-sage-soft');
  }
  search(e: Event, value: string) {
    e.preventDefault();
    this.router.navigate(['/products'], { queryParams: { q: value.trim() || null, category: this.activeCategory() || null }, queryParamsHandling: 'merge' });
  }
  sortBy(value: string) {
    this.router.navigate(['/products'], { queryParams: { sort: value === 'newest' ? null : value, category: this.activeCategory() || null }, queryParamsHandling: 'merge' });
  }
}
