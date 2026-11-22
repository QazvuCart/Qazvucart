import { Component, inject, signal } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { AdminAuth, errMsg } from '../core/admin-auth';

@Component({
  selector: 'qz-admin-login',
  template: `
    <main class="min-h-dvh grid place-items-center p-5">
      <form (submit)="submit($event, e.value, p.value)" class="w-full max-w-sm rounded-2xl bg-sage-soft shadow-lift p-6 space-y-4">
        <h1 class="text-3xl">Admin sign in</h1>
        <div><label class="lbl" for="e">Email</label><input #e id="e" type="email" class="field" autocomplete="username" required></div>
        <div><label class="lbl" for="p">Password</label><input #p id="p" type="password" class="field" autocomplete="current-password" required></div>
        @if (error()) { <p class="err" role="alert">{{ error() }}</p> }
        <button class="btn btn-primary w-full" [disabled]="busy()">{{ busy() ? 'Signing in…' : 'Sign in' }}</button>
      </form>
    </main>
  `,
})
export class AdminLogin {
  private auth = inject(AdminAuth);
  private router = inject(Router);
  error = signal(''); busy = signal(false);
  constructor() { inject(Meta).updateTag({ name: 'robots', content: 'noindex' }); }

  async submit(ev: Event, email: string, password: string) {
    ev.preventDefault(); this.busy.set(true); this.error.set('');
    try { await this.auth.login(email, password); this.router.navigate(['/admin']); }
    catch (e) { this.error.set(errMsg(e)); }
    this.busy.set(false);
  }
}
