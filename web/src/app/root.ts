import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { Header } from './layout/header';
import { Footer } from './layout/footer';

@Component({
  selector: 'qz-root',
  imports: [RouterOutlet, Header, Footer],
  template: `
    <a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:bg-porcelain focus:p-3 focus:rounded">Skip to content</a>
    @if (!isAdmin()) { <qz-header /> }
    <main id="main"><router-outlet /></main>
    @if (!isAdmin()) { <qz-footer /> }
  `,
})
export class Root {
  private router = inject(Router);
  isAdmin = toSignal(this.router.events.pipe(
    filter((e) => e instanceof NavigationEnd),
    map((e) => (e as NavigationEnd).urlAfterRedirects.startsWith('/admin')),
    startWith(this.router.url.startsWith('/admin')),
  ), { initialValue: false });
}
