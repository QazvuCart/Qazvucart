import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ShareService } from '../core/share';

/** Phone-only bottom bar: the main places are always one thumb-tap away, so there is no dead end on a long page. */
@Component({
  selector: 'qz-tabbar',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="tabbar md:hidden" aria-label="Quick navigation">
      <a routerLink="/" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }" class="tab">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/></svg>
        Home
      </a>
      <a routerLink="/products" routerLinkActive="on" class="tab">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>
        Shop
      </a>
      <button type="button" class="tab" (click)="shareThis()">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="M8.3 10.8l7.4-4.6M8.3 13.2l7.4 4.6"/></svg>
        Share
      </button>
      <a routerLink="/contact" routerLinkActive="on" class="tab">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg>
        Contact
      </a>
    </nav>
  `,
})
export class Tabbar {
  private share = inject(ShareService);
  private router = inject(Router);
  /** Shares whichever page the visitor is on right now. */
  shareThis() { this.share.quick(document.title, this.router.url.split('#')[0]); }
}
