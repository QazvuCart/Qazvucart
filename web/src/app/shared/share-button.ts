import { Component, ElementRef, afterNextRender, inject, input, signal } from '@angular/core';
import { ShareService } from '../core/share';

/** "Share" button with a small menu: device share sheet (when available), WhatsApp, copy link. */
@Component({
  selector: 'qz-share',
  host: { '(document:click)': 'outside($event)', '(document:keydown.escape)': 'hide()' },
  template: `
    <div class="relative inline-block">
      <button type="button" class="btn btn-quiet btn-sm gap-2" (click)="toggle()" [attr.aria-expanded]="open()" aria-haspopup="menu">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="M8.3 10.8l7.4-4.6M8.3 13.2l7.4 4.6"/>
        </svg>
        {{ label() }}
      </button>
      @if (open()) {
        <div role="menu" class="share-menu" [class.out]="closing()">
          @if (native()) { <button type="button" role="menuitem" class="share-item" (click)="device()">Share…</button> }
          <a role="menuitem" class="share-item" [href]="wa()" target="_blank" rel="noopener" (click)="hide()">Send on WhatsApp</a>
          <button type="button" role="menuitem" class="share-item" (click)="copy()">Copy link</button>
        </div>
      }
    </div>
  `,
})
export class ShareButton {
  private share = inject(ShareService);
  private host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  path = input.required<string>();
  title = input.required<string>();
  label = input('Share');

  open = signal(false);
  closing = signal(false);
  native = signal(false);

  constructor() { afterNextRender(() => this.native.set(this.share.canNative())); }

  wa() { return this.share.whatsappHref(this.title() + ' — QazvuCart', this.path()); }
  toggle() { this.open() ? this.hide() : this.open.set(true); }
  hide() {
    if (!this.open() || this.closing()) return;
    this.closing.set(true);
    setTimeout(() => { this.open.set(false); this.closing.set(false); }, 180);
  }
  outside(e: Event) { if (this.open() && !this.host.contains(e.target as Node)) this.hide(); }
  async device() { this.hide(); await this.share.native(this.title() + ' — QazvuCart', this.path()); }
  async copy() { this.hide(); await this.share.copy(this.path()); }
}
