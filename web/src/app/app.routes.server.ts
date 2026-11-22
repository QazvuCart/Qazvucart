import { RenderMode, ServerRoute } from '@angular/ssr';

// Catalogue data changes often, so every route renders per request.
export const serverRoutes: ServerRoute[] = [{ path: '**', renderMode: RenderMode.Server }];
