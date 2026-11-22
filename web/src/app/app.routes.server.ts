import { RenderMode, ServerRoute } from '@angular/ssr';

// Catalogue data changes often, so every route renders per request.
// The admin area depends on the browser's session cookie, so it renders in the browser only.
export const serverRoutes: ServerRoute[] = [
  { path: 'admin', renderMode: RenderMode.Client },
  { path: 'admin/**', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Server },
];
