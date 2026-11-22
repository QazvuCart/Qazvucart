import { DOCUMENT } from '@angular/common';
import { InjectionToken, inject } from '@angular/core';

/** Public origin used in canonical and Open Graph URLs. The server overrides it from PUBLIC_SITE_URL. */
export const SITE_URL = new InjectionToken<string>('SITE_URL', {
  providedIn: 'root',
  factory: () => inject(DOCUMENT).location?.origin ?? '',
});
