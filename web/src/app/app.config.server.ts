import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { provideServerRouting } from '@angular/ssr';
import { appConfig } from './app.config';
import { SITE_URL } from './core/site-url';
import { serverRoutes } from './app.routes.server';

export const config: ApplicationConfig = mergeApplicationConfig(appConfig, {
  providers: [
    provideServerRendering(),
    provideServerRouting(serverRoutes),
    { provide: SITE_URL, useFactory: () => (process.env['PUBLIC_SITE_URL'] || 'http://localhost:4200').replace(/\/$/, '') },
  ],
});
