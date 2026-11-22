import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'qz-header',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="sticky top-0 z-40 bg-porcelain/95 backdrop-blur border-b border-forest/10">
      <div class="container-qz flex items-center justify-between h-16">
        <a routerLink="/" class="font-display text-2xl font-bold tracking-tight no-underline text-forest flex items-center gap-2" aria-label="QazvuCart home">
          <span class="inline-block size-3 rounded-sm bg-tangerine" aria-hidden="true"></span>QazvuCart
        </a>

        <nav class="hidden md:flex items-center gap-8" aria-label="Main">
          @for (l of links; track l.path) {
            <a [routerLink]="l.path" routerLinkActive="underline decoration-2 underline-offset-8 decoration-tangerine"
               [routerLinkActiveOptions]="{ exact: true }" class="py-3 font-medium no-underline text-forest">{{ l.label }}</a>
          }
        </nav>

        <button type="button" class="md:hidden size-12 grid place-items-center -mr-2" (click)="open.set(!open())"
                [attr.aria-expanded]="open()" aria-controls="mobile-nav" aria-label="Menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            @if (open()) { <path d="M5 5l14 14M19 5L5 19"/> } @else { <path d="M4 7h16M4 12h16M4 17h16"/> }
          </svg>
        </button>
      </div>

      @if (open()) {
        <nav id="mobile-nav" class="md:hidden bg-sage-soft border-t border-forest/10" aria-label="Main mobile">
          <div class="container-qz py-2 flex flex-col">
            @for (l of links; track l.path) {
              <a [routerLink]="l.path" (click)="open.set(false)" class="min-h-12 flex items-center text-lg font-medium no-underline text-forest border-b border-forest/10 last:border-0">{{ l.label }}</a>
            }
          </div>
        </nav>
      }
    </header>
  `,
})
export class Header {
  open = signal(false);
  links = [
    { path: '/products', label: 'Shop' },
    { path: '/about', label: 'About' },
    { path: '/contact', label: 'Contact' },
  ];
}
