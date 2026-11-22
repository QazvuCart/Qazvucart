import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminApi, AdminProductRow } from '../core/admin-api';
import { errMsg } from '../core/admin-auth';
import { cld } from '../core/cloudinary';
import { formatMinor } from '../core/product.model';

@Component({
  selector: 'qz-products-list',
  imports: [RouterLink],
  template: `
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-3xl md:text-4xl">Products</h1>
      <a routerLink="/admin/products/new" class="btn btn-primary">Add product</a>
    </div>
    <form class="mt-6 flex flex-wrap gap-3" (submit)="$event.preventDefault(); q.set(s.value); load()">
      <label class="sr-only" for="s">Search</label>
      <input #s id="s" type="search" class="field md:max-w-xs" placeholder="Search name or product ID">
      <label class="sr-only" for="st">Status</label>
      <select id="st" class="field md:max-w-48" (change)="status.set($any($event.target).value); load()">
        <option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option>
      </select>
      <button class="btn btn-quiet btn-sm">Search</button>
    </form>
    @if (error()) { <p class="err mt-4" role="alert">{{ error() }}</p> }

    @if (rows(); as list) {
      @if (!list.length) { <p class="mt-8">No products found.</p> }
      <ul class="mt-6 grid gap-4 list-none p-0">
        @for (r of list; track r.id) {
          <li class="rounded-2xl bg-sage-soft p-4 grid gap-3 md:grid-cols-[4rem_1fr_auto] md:items-center">
            <div class="size-16 rounded-lg bg-sage overflow-hidden">@if (r.imageUrl) { <img [src]="cld(r.imageUrl, 128)" alt="" class="size-full object-cover"> }</div>
            <div>
              <a [routerLink]="['/admin/products', r.id]" class="font-semibold text-lg">{{ r.name }}</a>
              <p class="text-sm">{{ r.productCode }} · {{ r.priceMinor === null ? 'No price set' : money(r.priceMinor) }} · {{ r.categoryName ?? 'No category' }}</p>
              <p class="text-sm font-medium">{{ r.archivedAt ? 'Archived' : r.active ? 'Active' : 'Inactive' }}{{ r.featured ? ' · Featured' : '' }}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <a [routerLink]="['/admin/products', r.id]" class="btn btn-quiet btn-sm">Edit</a>
              @if (!r.archivedAt) {
                <button type="button" class="btn btn-quiet btn-sm" (click)="patch(r, { active: !r.active })">{{ r.active ? 'Deactivate' : 'Activate' }}</button>
                <button type="button" class="btn btn-quiet btn-sm" (click)="patch(r, { featured: !r.featured })">{{ r.featured ? 'Unfeature' : 'Feature' }}</button>
                <button type="button" class="btn btn-quiet btn-sm" (click)="patch(r, { archived: true })">Archive</button>
              } @else {
                <button type="button" class="btn btn-quiet btn-sm" (click)="patch(r, { archived: false })">Restore</button>
              }
              <button type="button" class="btn btn-danger btn-sm" (click)="remove(r)">Delete</button>
            </div>
          </li>
        }
      </ul>
    } @else { <p class="mt-8">Loading…</p> }
  `,
})
export class ProductsList {
  private api = inject(AdminApi);
  rows = signal<AdminProductRow[] | null>(null);
  error = signal('');
  q = signal(''); status = signal('all');
  money = formatMinor; cld = cld;

  constructor() { this.load(); }
  load() {
    this.api.products(this.q(), this.status()).subscribe({ next: (r) => { this.rows.set(r); this.error.set(''); }, error: (e) => this.error.set(errMsg(e)) });
  }
  patch(r: AdminProductRow, body: object) {
    this.api.patchProduct(r.id, body).subscribe({ next: () => this.load(), error: (e) => this.error.set(errMsg(e)) });
  }
  remove(r: AdminProductRow) {
    if (!confirm(`Permanently delete "${r.name}" and its images? This cannot be undone. Archive it instead to keep it hidden.`)) return;
    this.api.deleteProduct(r.id).subscribe({ next: () => this.load(), error: (e) => this.error.set(errMsg(e)) });
  }
}
