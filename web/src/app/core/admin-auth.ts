import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, firstValueFrom, throwError } from 'rxjs';

interface Me { email: string; csrf: string; }

@Injectable({ providedIn: 'root' })
export class AdminAuth {
  private http = inject(HttpClient);
  private router = inject(Router);
  email = signal<string | null>(null);
  csrf = signal<string | null>(null);

  /** True when the browser already holds a valid admin session. */
  async ensure(): Promise<boolean> {
    if (this.email()) return true;
    try { this.set(await firstValueFrom(this.http.get<Me>('/api/admin/me'))); return true; } catch { return false; }
  }
  async login(email: string, password: string) { this.set(await firstValueFrom(this.http.post<Me>('/api/admin/login', { email, password }))); }
  async logout() {
    try { await firstValueFrom(this.http.post('/api/admin/logout', {})); } catch { /* session may already be gone */ }
    this.clear(); this.router.navigate(['/admin/login']);
  }
  private set(m: Me) { this.email.set(m.email); this.csrf.set(m.csrf); }
  clear() { this.email.set(null); this.csrf.set(null); }
}

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AdminAuth), router = inject(Router);
  return (await auth.ensure()) || router.createUrlTree(['/admin/login']);
};

/** Adds the CSRF header to admin writes and sends the user to the login page when the session ends. */
export const adminInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/admin')) return next(req);
  const auth = inject(AdminAuth), router = inject(Router);
  const csrf = auth.csrf();
  const r = csrf && req.method !== 'GET' ? req.clone({ setHeaders: { 'x-csrf-token': csrf } }) : req;
  return next(r).pipe(catchError((e: unknown) => {
    if (e instanceof HttpErrorResponse && e.status === 401 && !req.url.endsWith('/login') && !req.url.endsWith('/me')) {
      auth.clear(); router.navigate(['/admin/login']);
    }
    return throwError(() => e);
  }));
};

export function errMsg(e: unknown): string {
  if (e instanceof HttpErrorResponse) return e.error?.issues?.[0]?.message ?? e.error?.error ?? 'Something went wrong. Try again.';
  return e instanceof Error ? e.message : 'Something went wrong. Try again.';
}
