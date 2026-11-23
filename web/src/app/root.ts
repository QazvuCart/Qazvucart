import { Component, DestroyRef, afterNextRender, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { Header } from './layout/header';
import { Footer } from './layout/footer';
import { initSmoothScroll } from './shared/motion';

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

  constructor() {
    const destroyRef = inject(DestroyRef);
    // Browser only. Desktop mouse-wheel inertia + eased in-page anchor jumps; touch devices stay native.
    afterNextRender(() => {
      const stopSmooth = initSmoothScroll(() => !location.pathname.startsWith('/admin') && !document.body.classList.contains('qz-lock'));
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const onClick = (e: MouseEvent) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const a = (e.target as Element | null)?.closest?.('a[href^="#"]');
        const id = a?.getAttribute('href')?.slice(1);
        const target = id && id !== 'main' ? document.getElementById(id) : null; // leave the skip link native (keeps keyboard focus)
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        history.replaceState(null, '', location.pathname + location.search + '#' + id);
      };
      document.addEventListener('click', onClick);
      destroyRef.onDestroy(() => { stopSmooth(); document.removeEventListener('click', onClick); });
    });
  }
  isAdmin = toSignal(this.router.events.pipe(
    filter((e) => e instanceof NavigationEnd),
    map((e) => (e as NavigationEnd).urlAfterRedirects.startsWith('/admin')),
    startWith(this.router.url.startsWith('/admin')),
  ), { initialValue: false });
}
