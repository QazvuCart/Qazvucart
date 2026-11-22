import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AdminApi } from '../core/admin-api';

@Component({
  selector: 'qz-dashboard',
  imports: [RouterLink, DatePipe],
  template: `
    <h1 class="text-3xl md:text-4xl">Dashboard</h1>
    @if (stats(); as s) {
      <dl class="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
        @for (c of [['Products', s.products.total], ['Active', s.products.active], ['Inactive', s.products.inactive], ['Archived', s.products.archived], ['Categories', s.categories]]; track c[0]) {
          <div class="rounded-2xl bg-sage-soft p-4"><dt class="text-sm">{{ c[0] }}</dt><dd class="text-3xl font-display font-bold">{{ c[1] }}</dd></div>
        }
      </dl>
      <h2 class="mt-10 text-2xl">Recent updates</h2>
      @if (s.recent.length) {
        <ul class="mt-4 divide-y divide-forest/15 list-none p-0">
          @for (r of s.recent; track r.id) {
            <li class="flex justify-between gap-4 py-3"><a [routerLink]="['/admin/products', r.id]" class="font-medium">{{ r.name }}</a><span class="text-sm">{{ r.updatedAt | date: 'medium' }}</span></li>
          }
        </ul>
      } @else { <p class="mt-3">No products yet. <a routerLink="/admin/products/new" class="underline">Add the first product</a>.</p> }
    } @else { <p class="mt-6">Loading…</p> }
  `,
})
export class Dashboard {
  stats = toSignal(inject(AdminApi).stats().pipe(catchError(() => of(null))));
}
