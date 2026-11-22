import { isPlatformServer } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';

/** During SSR there is no dev-server proxy, so relative /api calls go straight to the API. */
export const apiBaseInterceptor: HttpInterceptorFn = (req, next) => {
  if (isPlatformServer(inject(PLATFORM_ID)) && req.url.startsWith('/api')) {
    const origin = process.env['API_ORIGIN'] || 'http://localhost:4000';
    return next(req.clone({ url: origin + req.url }));
  }
  return next(req);
};
