import { Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { Seo } from '../core/seo';
import { ProductCard } from '../core/product.model';
import { ProductsService } from '../core/products.service';
import { EmptyCatalogue } from '../shared/empty-catalogue';
import { SpatialGrid } from '../shared/spatial-grid';

type State = { status: 'loading' | 'ok' | 'error'; items: ProductCard[] };

/** Serves /products (filters in the query string) and /categories/:slug. */
@Component({
  selector: 'qz-products',
  imports: [RouterLink, SpatialGrid, EmptyCatalogue],
  template: `
    <section class="container-qz py-10 md:py-16">
      <h1 class="text-4xl md:text-6xl">{{ heading() }}</h1>

      <div class="mt-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
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
        <nav class="mt-6 flex flex-wrap gap-2" aria-label="Categories">
          <a routerLink="/products" [queryParams]="{ category: null }" queryParamsHandling="merge" [class]="chip(!activeCategory())"
             [attr.aria-current]="!activeCategory() ? 'true' : null">All</a>
          @for (c of categories(); track c.slug) {
            <a routerLink="/products" [queryParams]="{ category: c.slug }" queryParamsHandling="merge" [class]="chip(activeCategory() === c.slug)"
               [attr.aria-current]="activeCategory() === c.slug ? 'true' : null">{{ c.name }}</a>
          }
        </nav>
      }

      <div class="mt-10" [attr.aria-busy]="state().status === 'loading'">
        @switch (state().status) {
          @case ('loading') {
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
              @for (i of [1, 2, 3, 4]; track i) { <div class="aspect-[4/5] rounded-2xl bg-sage-soft"></div> }
            </div>
          }
          @case ('error') { <qz-empty-catalogue [failed]="true" /> }
          @default {
            @if (state().items.length) { <qz-spatial-grid [products]="state().items" /> }
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

  constructor() {
    const seo = inject(Seo);
    seo.set({ title: 'Products — QazvuCart', description: 'Browse QazvuCart wall posters and custom mobile phone cases.', path: '/products' });
  }

  chip(active: boolean) {
    return 'min-h-11 inline-flex items-center rounded-full px-4 no-underline font-medium border-2 ' +
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
