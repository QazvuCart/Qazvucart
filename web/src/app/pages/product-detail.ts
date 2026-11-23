import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { cld, srcset } from '../core/cloudinary';
import { ProductDetail, formatMinor } from '../core/product.model';
import { ProductsService } from '../core/products.service';
import { Seo } from '../core/seo';
import { NotFound } from './not-found';
import { OrderForm } from './order-form';
import { Tilt } from '../shared/motion-directives';

type State = { status: 'loading' | 'ok' | 'notfound' | 'error'; product?: ProductDetail };

@Component({
  selector: 'qz-product-detail',
  imports: [RouterLink, NotFound, OrderForm, Tilt],
  host: { '(document:keydown)': 'key($event)' },
  template: `
    @switch (state().status) {
      @case ('loading') { <section class="container-qz py-16"><div class="aspect-[4/5] md:aspect-[16/9] rounded-2xl bg-sage-soft"></div></section> }
      @case ('notfound') { <qz-not-found /> }
      @case ('error') {
        <section class="container-qz py-24 min-h-[50dvh]">
          <h1 class="text-4xl">This product could not load</h1>
          <p class="mt-3">Check your connection and reload the page.</p>
        </section>
      }
      @default {
        @if (state().product; as p) {
          <section class="container-qz py-8 md:py-14">
            <nav aria-label="Breadcrumb" class="text-sm mb-6">
              <a routerLink="/products" class="underline underline-offset-4">Products</a>
              @if (p.category) { <span> / </span><a [routerLink]="['/categories', p.category.slug]" class="underline underline-offset-4">{{ p.category.name }}</a> }
            </nav>

            <div class="grid gap-10 md:grid-cols-[1.1fr_1fr] items-start">
              <!-- Gallery: whole image is always visible (never cropped); tap it for full screen. -->
              <div>
                <div class="pd-stage">
                  @if (p.images[activeImg()]; as img) {
                    <button type="button" class="pd-open tilt" qzTilt="3" (click)="openZoom()" aria-label="View image full screen">
                      @for (im of [img]; track im.url) {
                        <img class="pd-img" [class.pd-prev]="dir() < 0" [src]="cld(im.url, 1280)" [attr.srcset]="srcset(im.url, [480, 720, 960, 1280, 1600])"
                             [attr.sizes]="'(min-width: 768px) 55vw, 100vw'" [alt]="im.alt" [attr.width]="im.width" [attr.height]="im.height" fetchpriority="high" decoding="async">
                      }
                      <span class="pd-full" aria-hidden="true">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>
                      </span>
                    </button>
                  } @else {
                    <div class="pd-empty">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" class="opacity-40" role="img" aria-label="No image yet">
                        <rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 18l5-5 4 4 3-3 4 4"/>
                      </svg>
                    </div>
                  }
                </div>
                @if (p.images.length > 1) {
                  <ul class="mt-4 flex gap-3 overflow-x-auto list-none p-0 pb-2">
                    @for (img of p.images; track $index) {
                      <li><button type="button" (click)="select($index)" [attr.aria-label]="'Show image ' + ($index + 1)" [attr.aria-current]="$index === activeImg()"
                                  class="size-16 rounded-lg overflow-hidden border-2 bg-sage-soft" [class]="$index === activeImg() ? 'border-tangerine' : 'border-transparent'">
                        <img [src]="cld(img.url, 128)" alt="" loading="lazy" class="size-full object-contain"></button></li>
                    }
                  </ul>
                }
              </div>

              <!-- Options -->
              <div>
                <h1 class="text-4xl md:text-5xl">{{ p.name }}</h1>
                <p class="mt-2 text-sm">Product ID: {{ p.productCode }}</p>
                <p class="mt-4 text-3xl font-display font-bold">
                  @if (p.priceMinor !== null) { {{ money(p.priceMinor) }} } @else { <span class="text-xl font-medium">Price not set yet</span> }
                </p>
                @if (p.description) { <p class="mt-4 max-w-prose whitespace-pre-line">{{ p.description }}</p> }

                @for (g of groups(); track g.name) {
                  <fieldset class="mt-6">
                    <legend class="font-semibold">{{ g.name }}</legend>
                    <div class="mt-2 flex flex-wrap gap-2">
                      @for (o of g.options; track o.id) {
                        <label class="cursor-pointer">
                          <input type="radio" class="peer sr-only" [name]="g.name" [checked]="selected()[g.name] === o.value" (change)="choose(g.name, o.value)">
                          <span class="min-h-11 inline-flex items-center rounded-full border-2 border-forest/30 px-4 peer-checked:bg-tangerine peer-checked:border-tangerine peer-focus-visible:outline-3 peer-focus-visible:outline-forest">
                            {{ o.value }}@if (o.extra > 0) { <span class="ml-1 text-sm">(+{{ money(o.extra) }})</span> }
                          </span>
                        </label>
                      }
                    </div>
                  </fieldset>
                }

                <div class="mt-6">
                  <span id="qty-l" class="font-semibold">Quantity</span>
                  <div class="mt-2 inline-flex items-center rounded-xl border-2 border-forest/30" role="group" aria-labelledby="qty-l">
                    <button type="button" class="size-12 text-xl" (click)="setQty(qty() - 1)" aria-label="Decrease quantity">−</button>
                    <output class="w-10 text-center font-semibold" aria-live="polite">{{ qty() }}</output>
                    <button type="button" class="size-12 text-xl" (click)="setQty(qty() + 1)" aria-label="Increase quantity">+</button>
                  </div>
                </div>

                @if (p.customisable) {
                  <div class="mt-6">
                    <label for="note" class="font-semibold">Customisation details</label>
                    @if (p.customisationInstructions) { <p class="text-sm mt-1 whitespace-pre-line">{{ p.customisationInstructions }}</p> }
                    <textarea id="note" rows="4" maxlength="500" [value]="note()" (input)="note.set($any($event.target).value)"
                              class="mt-2 w-full rounded-xl border-2 border-forest/30 bg-porcelain p-3"></textarea>
                    <p class="text-sm text-right">{{ note().length }}/500</p>
                    <p class="text-sm">To use your own image, send it in the WhatsApp chat after your order request. Images cannot be uploaded on this page.</p>
                  </div>
                }

                <div class="mt-8 rounded-2xl bg-sage-soft p-5" aria-live="polite">
                  <h2 class="text-xl">Order summary</h2>
                  @if (p.priceMinor === null) {
                    <p class="mt-2">This product cannot be ordered until its price is set.</p>
                  } @else {
                    <dl class="mt-3 grid grid-cols-[1fr_auto] gap-y-1">
                      <dt>Unit price</dt><dd>{{ money(unit()!) }}</dd>
                      <dt>Quantity</dt><dd>{{ qty() }}</dd>
                      <dt class="font-semibold">Subtotal</dt><dd class="font-semibold">{{ money(subtotal()!) }}</dd>
                    </dl>
                    <p class="mt-3 text-sm">Delivery charges are confirmed with you on WhatsApp.</p>
                    @if (missing().length) { <p class="mt-3 font-medium">Choose: {{ missing().join(', ') }}</p> }
                  }
                </div>

                <qz-order-form [product]="p" [selections]="selections()" [unitMinor]="unit()" [qty]="qty()"
                               [canOrder]="canOrder()" [missing]="missing()" [note]="p.customisable ? note() : ''" />
              </div>
            </div>
          </section>

          @if (zoom()) {
            <div class="lb" role="dialog" aria-modal="true" aria-label="Image viewer" (click)="closeZoom()" (touchstart)="swipeStart($event)" (touchend)="swipeEnd($event, p.images.length)">
              <button type="button" class="lb-btn lb-close" (click)="closeZoom(); $event.stopPropagation()" aria-label="Close full screen view">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>
              </button>
              @if (p.images.length > 1) {
                <button type="button" class="lb-btn lb-nav lb-left" (click)="go(-1, p.images.length); $event.stopPropagation()" aria-label="Previous image">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>
                </button>
                <button type="button" class="lb-btn lb-nav lb-right" (click)="go(1, p.images.length); $event.stopPropagation()" aria-label="Next image">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>
                </button>
                <span class="lb-count" aria-live="polite">{{ activeImg() + 1 }} / {{ p.images.length }}</span>
              }
              @if (p.images[activeImg()]; as img) {
                @for (im of [img]; track im.url) {
                  <img class="lb-img" [class.pd-prev]="dir() < 0" [src]="cld(im.url, 1600)" [attr.srcset]="srcset(im.url, [960, 1280, 1600, 2000])" sizes="100vw"
                       [alt]="im.alt" (click)="$event.stopPropagation()">
                }
              }
            </div>
          }
        }
      }
    }
  `,
})
export class ProductDetailPage {
  private api = inject(ProductsService);
  slug = input.required<string>();
  money = formatMinor;
  cld = cld;
  srcset = srcset;

  state = toSignal(
    toObservable(this.slug).pipe(
      switchMap((s) => this.api.detail(s).pipe(
        map((product): State => ({ status: 'ok', product })),
        startWith<State>({ status: 'loading' }),
        catchError((e: unknown) => of<State>({ status: e instanceof HttpErrorResponse && e.status === 404 ? 'notfound' : 'error' })),
      )),
    ),
    { initialValue: { status: 'loading' } as State },
  );

  activeImg = signal(0);
  dir = signal(1);   // 1 = moving forward, -1 = back; decides which way the 3D swing goes
  zoom = signal(false);
  private touchX = 0;
  selected = signal<Record<string, string>>({});
  qty = signal(1);
  note = signal('');

  groups = computed(() => {
    const out: { name: string; options: { id: string; value: string; extra: number }[] }[] = [];
    for (const v of this.state().product?.variants ?? []) {
      let g = out.find((x) => x.name === v.name);
      if (!g) out.push((g = { name: v.name, options: [] }));
      g.options.push({ id: v.id, value: v.value, extra: v.additionalPriceMinor });
    }
    return out;
  });
  missing = computed(() => this.groups().filter((g) => !this.selected()[g.name]).map((g) => g.name));
  unit = computed(() => {
    const base = this.state().product?.priceMinor;
    if (base == null) return null;
    let total = base;
    for (const g of this.groups()) total += g.options.find((o) => o.value === this.selected()[g.name])?.extra ?? 0;
    return total;
  });
  subtotal = computed(() => (this.unit() === null ? null : this.unit()! * this.qty()));
  selections = computed(() => this.groups().map((g) => ({ name: g.name, value: this.selected()[g.name] ?? '' })).filter((s) => s.value));
  /** True when every required choice is made and a price exists. Enables the WhatsApp order button. */
  canOrder = computed(() => this.unit() !== null && this.missing().length === 0 && this.qty() >= 1);

  constructor() {
    const seo = inject(Seo);
    inject(DestroyRef).onDestroy(() => { if (typeof document !== 'undefined') document.body.classList.remove('qz-lock'); });
    effect(() => { this.slug(); this.selected.set({}); this.qty.set(1); this.note.set(''); this.activeImg.set(0); });
    effect(() => {
      const p = this.state().product;
      if (p) seo.set({
        title: `${p.name} — QazvuCart`,
        description: (p.description ?? `${p.name} from QazvuCart.`).replace(/\s+/g, ' ').slice(0, 155),
        path: `/products/${encodeURIComponent(p.slug)}`,
        image: p.images[0]?.url ?? null,
      });
    });
  }

  select(i: number) { this.dir.set(i >= this.activeImg() ? 1 : -1); this.activeImg.set(i); }
  go(d: number, n: number) { this.dir.set(d); this.activeImg.update((i) => (i + d + n) % n); }
  openZoom() { this.zoom.set(true); document.body.classList.add('qz-lock'); }
  closeZoom() { if (!this.zoom()) return; this.zoom.set(false); document.body.classList.remove('qz-lock'); }
  swipeStart(e: TouchEvent) { this.touchX = e.touches[0]?.clientX ?? 0; }
  swipeEnd(e: TouchEvent, n: number) {
    const dx = (e.changedTouches[0]?.clientX ?? 0) - this.touchX;
    if (n > 1 && Math.abs(dx) > 50) this.go(dx < 0 ? 1 : -1, n);
  }
  key(e: KeyboardEvent) {
    if (!this.zoom()) return;
    const n = this.state().product?.images.length ?? 0;
    if (e.key === 'Escape') this.closeZoom();
    else if (n > 1 && e.key === 'ArrowRight') this.go(1, n);
    else if (n > 1 && e.key === 'ArrowLeft') this.go(-1, n);
  }
  choose(name: string, value: string) { this.selected.update((s) => ({ ...s, [name]: value })); }
  setQty(n: number) { this.qty.set(Math.min(99, Math.max(1, Math.trunc(n)))); }
}
