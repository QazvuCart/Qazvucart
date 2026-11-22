import { Component, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminAuth } from '../core/admin-auth';

@Component({
  selector: 'qz-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="bg-forest text-porcelain">
      <div class="container-qz flex items-center justify-between gap-4 min-h-14">
        <span class="font-display font-bold text-xl">QazvuCart admin</span>
        <button type="button" class="btn btn-sm btn-quiet !text-porcelain !border-porcelain" (click)="auth.logout()">Sign out</button>
      </div>
      <nav class="container-qz flex gap-1 overflow-x-auto pb-2" aria-label="Admin">
        @for (l of links; track l.path) {
          <a [routerLink]="l.path" routerLinkActive="bg-tangerine !text-forest" [routerLinkActiveOptions]="{ exact: l.exact }"
             class="min-h-11 flex items-center px-4 rounded-lg no-underline text-porcelain whitespace-nowrap">{{ l.label }}</a>
        }
      </nav>
    </header>
    <div class="container-qz py-8"><router-outlet /></div>
  `,
})
export class AdminShell {
  auth = inject(AdminAuth);
  links = [
    { path: '/admin', label: 'Dashboard', exact: true }, { path: '/admin/products', label: 'Products', exact: false },
    { path: '/admin/categories', label: 'Categories', exact: false }, { path: '/admin/settings', label: 'Settings', exact: false },
  ];
  constructor() { inject(Meta).updateTag({ name: 'robots', content: 'noindex' }); }
}
