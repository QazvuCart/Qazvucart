import { Component, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AdminApi } from '../core/admin-api';
import { errMsg } from '../core/admin-auth';
import { cld } from '../core/cloudinary';
import { moneyToInput, parseMoney } from '../core/money';

interface VariantRow { variantName: string; variantValue: string; extra: string; active: boolean; }
interface ImageRow { publicId: string; url: string; altText: string; }
const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);

@Component({
  selector: 'qz-product-form',
  imports: [RouterLink],
  template: `
    <a routerLink="/admin/products" class="underline underline-offset-4">Products</a>
    <h1 class="mt-2 text-3xl md:text-4xl">{{ isNew() ? 'Add product' : 'Edit product' }}</h1>

    @if (loading()) { <p class="mt-6">Loading…</p> } @else {
    <form class="mt-6 grid gap-8 max-w-3xl" (submit)="save($event)" novalidate>
      <section class="grid gap-4 md:grid-cols-2">
        <div><label class="lbl" for="name">Product name</label><input id="name" class="field" maxlength="120" [value]="name()" (input)="onName($any($event.target).value)"></div>
        <div><label class="lbl" for="code">Product ID</label><input id="code" class="field" maxlength="40" [value]="code()" (input)="code.set($any($event.target).value)"></div>
        <div><label class="lbl" for="slug">Slug (web address)</label><input id="slug" class="field" maxlength="120" [value]="slug()" (input)="slug.set($any($event.target).value); slugTouched = true"></div>
        <div><label class="lbl" for="cat">Category</label>
          <select id="cat" class="field" (change)="categoryId.set($any($event.target).value)">
            <option value="" [selected]="!categoryId()">No category</option>
            @for (c of categories(); track c.id) { <option [value]="c.id" [selected]="categoryId() === c.id">{{ c.name }}</option> }
          </select></div>
        <div class="md:col-span-2"><label class="lbl" for="desc">Description</label><textarea id="desc" rows="5" class="field" maxlength="5000" [value]="desc()" (input)="desc.set($any($event.target).value)"></textarea></div>
        <div><label class="lbl" for="price">Price (₹)</label><input id="price" class="field" inputmode="decimal" placeholder="e.g. 499 or 499.50" [value]="price()" (input)="price.set($any($event.target).value)">
          <p class="text-sm mt-1">Leave empty if not decided. The product then cannot be ordered.</p></div>
        <div><label class="lbl" for="cmp">Comparison price (₹, optional)</label><input id="cmp" class="field" inputmode="decimal" [value]="comparison()" (input)="comparison.set($any($event.target).value)">
          <p class="text-sm mt-1">Only a genuine reference price. It is not shown on the storefront and no discount is calculated.</p></div>
      </section>

      <section class="grid gap-3">
        <h2 class="text-2xl">Images</h2>
        <p class="text-sm">JPG, PNG or WebP, up to 8 MB each, at most 10 images. The first image is the main image.</p>
        <ul class="grid gap-3 list-none p-0">
          @for (img of images(); track img.publicId; let i = $index) {
            <li class="rounded-xl bg-sage-soft p-3 grid gap-3 sm:grid-cols-[5rem_1fr_auto] sm:items-center">
              <img [src]="cld(img.url, 160)" alt="" class="size-20 rounded-lg object-cover bg-sage">
              <div><label class="lbl text-sm" [for]="'alt' + i">Alt text (describe the image)</label>
                <input [id]="'alt' + i" class="field" maxlength="200" [value]="img.altText" (input)="setAlt(i, $any($event.target).value)"></div>
              <div class="flex gap-2">
                <button type="button" class="btn btn-quiet btn-sm" [disabled]="i === 0" (click)="move(i, -1)" aria-label="Move earlier">↑</button>
                <button type="button" class="btn btn-quiet btn-sm" [disabled]="i === images().length - 1" (click)="move(i, 1)" aria-label="Move later">↓</button>
                <button type="button" class="btn btn-danger btn-sm" (click)="removeImage(i)">Remove</button>
              </div>
            </li>
          }
        </ul>
        @if (images().length < 10) {
          <div><label class="btn btn-quiet cursor-pointer">{{ uploading() ? 'Uploading…' : 'Add images' }}
            <input type="file" class="sr-only" multiple accept="image/jpeg,image/png,image/webp" [disabled]="uploading()" (change)="upload($event)"></label></div>
        }
        @if (uploadError()) { <p class="err" role="alert">{{ uploadError() }}</p> }
      </section>

      <section class="grid gap-3">
        <h2 class="text-2xl">Variants</h2>
        <p class="text-sm">Group options under a name, for example Size or Phone model. Customers must choose one value from each group.</p>
        @for (v of variants(); track $index; let i = $index) {
          <div class="rounded-xl bg-sage-soft p-3 grid gap-2 sm:grid-cols-[1fr_1fr_7rem_auto_auto] sm:items-end">
            <div><label class="lbl text-sm" [for]="'vn' + i">Group</label><input [id]="'vn' + i" class="field" maxlength="40" [value]="v.variantName" (input)="setVariant(i, 'variantName', $any($event.target).value)"></div>
            <div><label class="lbl text-sm" [for]="'vv' + i">Value</label><input [id]="'vv' + i" class="field" maxlength="60" [value]="v.variantValue" (input)="setVariant(i, 'variantValue', $any($event.target).value)"></div>
            <div><label class="lbl text-sm" [for]="'vp' + i">Extra ₹</label><input [id]="'vp' + i" class="field" inputmode="decimal" placeholder="0" [value]="v.extra" (input)="setVariant(i, 'extra', $any($event.target).value)"></div>
            <label class="flex items-center gap-2 min-h-12"><input type="checkbox" class="size-5" [checked]="v.active" (change)="setVariant(i, 'active', $any($event.target).checked)"> Active</label>
            <button type="button" class="btn btn-danger btn-sm" (click)="removeVariant(i)">Remove</button>
          </div>
        }
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn btn-quiet btn-sm" (click)="addVariant('Size')">Add size</button>
          <button type="button" class="btn btn-quiet btn-sm" (click)="addVariant('Phone model')">Add phone model</button>
          <button type="button" class="btn btn-quiet btn-sm" (click)="addVariant('')">Add other option</button>
        </div>
      </section>

      <section class="grid gap-3">
        <h2 class="text-2xl">Customisation and visibility</h2>
        <label class="flex items-center gap-3 min-h-11"><input type="checkbox" class="size-5" [checked]="customisable()" (change)="customisable.set($any($event.target).checked)"> Customer can add customisation details</label>
        @if (customisable()) {
          <div><label class="lbl" for="ci">Customisation instructions</label><textarea id="ci" rows="3" class="field" maxlength="1000" [value]="instructions()" (input)="instructions.set($any($event.target).value)"></textarea></div>
        }
        <label class="flex items-center gap-3 min-h-11"><input type="checkbox" class="size-5" [checked]="active()" (change)="active.set($any($event.target).checked)"> Active (visible in the store)</label>
        <label class="flex items-center gap-3 min-h-11"><input type="checkbox" class="size-5" [checked]="featured()" (change)="featured.set($any($event.target).checked)"> Featured on the home page</label>
      </section>

      @if (error()) { <p class="err" role="alert">{{ error() }}</p> }
      <div class="flex gap-3"><button class="btn btn-primary" [disabled]="saving() || uploading()">{{ saving() ? 'Saving…' : 'Save product' }}</button>
        <a routerLink="/admin/products" class="btn btn-quiet">Cancel</a></div>
    </form>
    }
  `,
})
export class ProductForm {
  private api = inject(AdminApi);
  private router = inject(Router);
  id = input.required<string>();
  cld = cld;
  categories = toSignal(this.api.categories().pipe(catchError(() => of([]))), { initialValue: [] });

  loading = signal(false); saving = signal(false); uploading = signal(false);
  error = signal(''); uploadError = signal('');
  slugTouched = false;
  name = signal(''); code = signal(''); slug = signal(''); desc = signal(''); categoryId = signal('');
  price = signal(''); comparison = signal('');
  customisable = signal(false); instructions = signal(''); active = signal(false); featured = signal(false);
  variants = signal<VariantRow[]>([]); images = signal<ImageRow[]>([]);

  isNew = () => this.id() === 'new';

  constructor() {
    effect(() => {
      const id = this.id();
      if (id === 'new') return;
      this.loading.set(true);
      this.api.product(id).subscribe({
        next: (p) => {
          this.name.set(p.name); this.code.set(p.productCode); this.slug.set(p.slug); this.slugTouched = true;
          this.desc.set(p.description ?? ''); this.categoryId.set(p.categoryId ?? '');
          this.price.set(moneyToInput(p.priceMinor)); this.comparison.set(moneyToInput(p.comparisonPriceMinor));
          this.customisable.set(p.customisable); this.instructions.set(p.customisationInstructions ?? '');
          this.active.set(p.active); this.featured.set(p.featured);
          this.variants.set(p.variants.map((v) => ({ variantName: v.variantName, variantValue: v.variantValue, extra: v.additionalPriceMinor ? moneyToInput(v.additionalPriceMinor) : '', active: v.active })));
          this.images.set(p.images.map((i) => ({ publicId: i.publicId, url: i.url, altText: i.altText })));
          this.loading.set(false);
        },
        error: (e) => { this.error.set(errMsg(e)); this.loading.set(false); },
      });
    });
  }

  onName(v: string) { this.name.set(v); if (!this.slugTouched) this.slug.set(slugify(v)); }
  addVariant(name: string) { this.variants.update((a) => [...a, { variantName: name, variantValue: '', extra: '', active: true }]); }
  setVariant(i: number, k: keyof VariantRow, v: string | boolean) { this.variants.update((a) => a.map((r, j) => (j === i ? { ...r, [k]: v } : r))); }
  removeVariant(i: number) { this.variants.update((a) => a.filter((_, j) => j !== i)); }
  setAlt(i: number, v: string) { this.images.update((a) => a.map((r, j) => (j === i ? { ...r, altText: v } : r))); }
  removeImage(i: number) { this.images.update((a) => a.filter((_, j) => j !== i)); }
  move(i: number, d: number) {
    this.images.update((a) => { const b = [...a]; [b[i], b[i + d]] = [b[i + d], b[i]]; return b; });
  }

  async upload(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const files = Array.from(input.files ?? []).slice(0, 10 - this.images().length);
    input.value = '';
    this.uploadError.set(''); this.uploading.set(true);
    for (const f of files) {
      try {
        const r = await this.api.uploadImage(f);
        this.images.update((a) => [...a, { publicId: r.publicId, url: r.url, altText: '' }]);
      } catch (e) { this.uploadError.set(errMsg(e)); }
    }
    this.uploading.set(false);
  }

  save(ev: Event) {
    ev.preventDefault(); this.error.set('');
    const fail = (m: string) => { this.error.set(m); };
    if (!this.name().trim()) return fail('Enter a product name.');
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(this.code().trim())) return fail('Product ID: letters, numbers, - and _ only.');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(this.slug())) return fail('Slug: lowercase letters, numbers and hyphens only.');
    const priceMinor = parseMoney(this.price()), comparisonPriceMinor = parseMoney(this.comparison());
    if (priceMinor === undefined) return fail('Price: enter a number such as 499 or 499.50.');
    if (comparisonPriceMinor === undefined) return fail('Comparison price: enter a number such as 599 or 599.50.');
    const variants = [];
    for (const v of this.variants()) {
      const extra = parseMoney(v.extra);
      if (!v.variantName.trim() || !v.variantValue.trim()) return fail('Fill in the group and value of every variant, or remove the empty ones.');
      if (extra === undefined) return fail('Variant extra price: enter a number such as 50 or 50.50.');
      variants.push({ variantName: v.variantName.trim(), variantValue: v.variantValue.trim(), additionalPriceMinor: extra ?? 0, active: v.active });
    }
    if (this.images().some((i) => !i.altText.trim())) return fail('Add alt text to every image.');

    this.saving.set(true);
    this.api.saveProduct(this.isNew() ? null : this.id(), {
      productCode: this.code().trim(), name: this.name().trim(), slug: this.slug(), description: this.desc().trim() || null,
      categoryId: this.categoryId() || null, priceMinor, comparisonPriceMinor, customisable: this.customisable(),
      customisationInstructions: this.customisable() ? this.instructions().trim() || null : null,
      active: this.active(), featured: this.featured(), variants,
      images: this.images().map((i) => ({ publicId: i.publicId, altText: i.altText.trim() })),
    }).subscribe({
      next: () => this.router.navigate(['/admin/products']),
      error: (e) => { this.error.set(errMsg(e)); this.saving.set(false); },
    });
  }
}
