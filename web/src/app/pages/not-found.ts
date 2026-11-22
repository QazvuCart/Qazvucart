import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'qz-not-found',
  imports: [RouterLink],
  template: `
    <section class="container-qz py-24 min-h-[50dvh]">
      <h1 class="text-4xl md:text-6xl">Page not found</h1>
      <p class="mt-4 max-w-prose text-lg">The page you opened does not exist or has moved.</p>
      <a routerLink="/" class="btn btn-primary mt-8">Go to home</a>
    </section>
  `,
})
export class NotFound {}
