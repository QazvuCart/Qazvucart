import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './layout/header';
import { Footer } from './layout/footer';

@Component({
  selector: 'qz-root',
  imports: [RouterOutlet, Header, Footer],
  template: `
    <a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:bg-porcelain focus:p-3 focus:rounded">Skip to content</a>
    <qz-header />
    <main id="main"><router-outlet /></main>
    <qz-footer />
  `,
})
export class Root {}
