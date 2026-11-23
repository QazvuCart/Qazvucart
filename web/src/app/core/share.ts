import { Injectable, inject, signal } from '@angular/core';
import { SITE_URL } from './site-url';

/**
 * Shareable links. Uses the phone's native share sheet when there is one, otherwise copies the link.
 * `path` is always a site path (for example /products/blue-poster); the public origin is added here,
 * so a shared link opens the same page for whoever receives it. Browser only (called from click handlers).
 */
@Injectable({ providedIn: 'root' })
export class ShareService {
  private site = inject(SITE_URL);

  /** Toast text, and whether it is currently faded in (so it can fade out before it is removed). */
  toastMsg = signal<string | null>(null);
  toastOn = signal(false);
  private timers: ReturnType<typeof setTimeout>[] = [];

  url(path: string): string { return this.site + path; }
  canNative(): boolean { return typeof navigator !== 'undefined' && typeof navigator.share === 'function'; }
  whatsappHref(title: string, path: string): string {
    return `https://wa.me/?text=${encodeURIComponent(`${title}\n${this.url(path)}`)}`;
  }

  /** Native share sheet. Returns false if the person closed it. Falls back to copying if it fails. */
  async native(title: string, path: string): Promise<boolean> {
    try {
      await navigator.share({ title, text: title, url: this.url(path) });
      return true;
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return false;
      return this.copy(path);
    }
  }

  async copy(path: string): Promise<boolean> {
    const text = this.url(path);
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; }
    catch {
      try { // older browsers / insecure context
        const ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;top:0';
        document.body.appendChild(ta); ta.select();
        ok = document.execCommand('copy');
        ta.remove();
      } catch { ok = false; }
    }
    this.say(ok ? 'Link copied' : 'Could not copy the link');
    return ok;
  }

  /** One-tap share: native sheet where it exists, otherwise copy. */
  quick(title: string, path: string) {
    return this.canNative() ? this.native(title, path) : this.copy(path);
  }

  say(msg: string) {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.toastMsg.set(msg);
    this.toastOn.set(true);
    this.timers.push(setTimeout(() => this.toastOn.set(false), 2000));
    this.timers.push(setTimeout(() => this.toastMsg.set(null), 2400));
  }
}
